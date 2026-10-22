const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BREVO_API_URL = "https://api.brevo.com/v3"
const BREVO_REQUEST_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 2_048
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000
const RATE_LIMIT_MAX_REQUESTS = 5

// Best-effort, per-instance abuse protection. Serverless instances do not
// share memory, so this is a first line of defense rather than a hard quota.
const rateLimitStore = new Map<string, number[]>()

const welcomeEmail = {
  subject: "You're on the aika waitlist",
  textContent: `You're on the list.

Thanks for joining aika. We're building something new, and you'll be among the first to hear what comes next.

A little anticipation goes a long way.

— aika`,
  htmlContent: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#15101d;padding:0;font-family:Arial,sans-serif;color:#faf9fc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#15101d;">
      <tr>
        <td align="center" style="padding:48px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;border:1px solid #4b4259;background:#211a2b;">
            <tr>
              <td style="padding:28px 36px;border-bottom:1px solid #4b4259;color:#c2a1ff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                aika
              </td>
            </tr>
            <tr>
              <td style="padding:48px 36px;">
                <p style="margin:0 0 20px;color:#c2a1ff;font-family:monospace;font-size:12px;letter-spacing:1.4px;">
                  WAITLIST CONFIRMED
                </p>
                <h1 style="margin:0 0 24px;color:#faf9fc;font-family:monospace;font-size:34px;font-weight:400;line-height:1.25;">
                  You're on the list.
                </h1>
                <p style="margin:0 0 16px;color:#c9c3d2;font-size:17px;line-height:1.65;">
                  Thanks for joining aika. We're building something new, and you'll be among the first to hear what comes next.
                </p>
                <p style="margin:32px 0 0;color:#c9c3d2;font-size:14px;line-height:1.6;">
                  A little anticipation goes a long way.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px;border-top:1px solid #4b4259;color:#8f879c;font-family:monospace;font-size:11px;letter-spacing:0.8px;">
                AIKA / PRE-LAUNCH
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
}

function brevoRequest(path: string, body: unknown, apiKey: string) {
  return fetch(`${BREVO_API_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(BREVO_REQUEST_TIMEOUT_MS),
  })
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

/**
 * Records a hit for `key` and reports whether it exceeded the window quota.
 */
function isRateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (rateLimitStore.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  )

  recent.push(now)
  rateLimitStore.set(key, recent)

  // Keep the map from growing without bound in long-lived instances.
  if (rateLimitStore.size > 5_000) {
    for (const [storedKey, timestamps] of rateLimitStore) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitStore.delete(storedKey)
      }
    }
  }

  return recent.length > RATE_LIMIT_MAX_REQUESTS
}

function readStringField(payload: unknown, field: string): string {
  if (typeof payload !== "object" || payload === null) return ""

  const value = (payload as Record<string, unknown>)[field]
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""

  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      { message: "Please enter a valid email address." },
      { status: 415 },
    )
  }

  const rawBody = await request.text()

  if (rawBody.length > MAX_BODY_BYTES) {
    return Response.json({ message: "Invalid request." }, { status: 413 })
  }

  let payload: unknown

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    )
  }

  // Honeypot: real users never fill this hidden field. Return a success-shaped
  // response so bots do not learn that they were filtered out.
  if (readStringField(payload, "company").trim()) {
    return Response.json({ success: true, confirmationSent: false })
  }

  const email = readStringField(payload, "email").trim().toLowerCase()

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return Response.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    )
  }

  if (isRateLimited(getClientIp(request))) {
    return Response.json(
      { message: "Too many attempts. Please try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1_000) },
      },
    )
  }

  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim()

  if (
    !apiKey ||
    !Number.isInteger(listId) ||
    listId <= 0 ||
    !senderEmail ||
    !EMAIL_PATTERN.test(senderEmail)
  ) {
    console.error(
      "[waitlist] Brevo is not configured. Set BREVO_API_KEY, BREVO_LIST_ID and BREVO_SENDER_EMAIL.",
    )
    return Response.json(
      { message: "Waitlist signup is temporarily unavailable." },
      { status: 503 },
    )
  }

  let contactResponse: Response

  try {
    contactResponse = await brevoRequest(
      "/contacts",
      {
        email,
        listIds: [listId],
        updateEnabled: true,
      },
      apiKey,
    )
  } catch (error) {
    console.error("[waitlist] Brevo contact request failed", error)
    return Response.json(
      { message: "We couldn't add you right now. Please try again." },
      { status: 502 },
    )
  }

  if (!contactResponse.ok) {
    console.error(
      "[waitlist] Brevo contact request rejected",
      contactResponse.status,
    )
    return Response.json(
      { message: "We couldn't add you right now. Please try again." },
      { status: 502 },
    )
  }

  // Brevo replies 204 when `updateEnabled` updates an existing contact. Avoid
  // re-sending the welcome email to people who already joined.
  if (contactResponse.status === 204) {
    return Response.json({ success: true, alreadySubscribed: true })
  }

  try {
    const emailResponse = await brevoRequest(
      "/smtp/email",
      {
        sender: { name: "aika", email: senderEmail },
        to: [{ email }],
        ...welcomeEmail,
      },
      apiKey,
    )

    if (!emailResponse.ok) {
      console.error(
        "[waitlist] Brevo welcome email failed",
        emailResponse.status,
      )
    }

    return Response.json({
      success: true,
      confirmationSent: emailResponse.ok,
    })
  } catch (error) {
    console.error("[waitlist] Brevo welcome email request failed", error)
    return Response.json({ success: true, confirmationSent: false })
  }
}

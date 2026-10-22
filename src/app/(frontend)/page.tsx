"use client"

import { FormEvent, useEffect, useRef, useState } from "react"

const asset = (name: string) => `/assets/${name}`

type GameObstacle = {
  id: number
  x: number
  y: number
}

const fins = [
  { src: "1911b.svg", side: "left", offset: 24, top: 26.4, height: 746.4 },
  { src: "86934.svg", side: "left", offset: 79.2, top: 57.6, height: 693.6 },
  { src: "6f03f.svg", side: "left", offset: 134.4, top: 88.8, height: 640.8 },
  { src: "b8bd3.svg", side: "left", offset: 189.6, top: 120, height: 588 },
  { src: "378b9.svg", side: "left", offset: 244.8, top: 151.2, height: 535.2 },
  { src: "e2152.svg", side: "left", offset: 300, top: 182.4, height: 482.4 },
  { src: "4ee5b.svg", side: "right", offset: 24, top: 26.4, height: 746.4 },
  { src: "67891.svg", side: "right", offset: 79.2, top: 57.6, height: 693.6 },
  { src: "7e898.svg", side: "right", offset: 134.4, top: 88.8, height: 640.8 },
  { src: "09e11.svg", side: "right", offset: 189.6, top: 120, height: 588 },
  { src: "df6c0.svg", side: "right", offset: 244.8, top: 151.2, height: 535.2 },
  { src: "d0c72.svg", side: "right", offset: 300, top: 182.4, height: 482.4 },
] as const

const DEFAULT_MESSAGE = "Only aika news. Unsubscribe anytime."

type MessageTone = "default" | "error" | "success"

export default function App() {
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [messageTone, setMessageTone] = useState<MessageTone>("default")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageScale, setPageScale] = useState(1)
  const [pageWidth, setPageWidth] = useState(1728)
  const [gameOpen, setGameOpen] = useState(false)
  const [gameRunning, setGameRunning] = useState(false)
  const [gameScore, setGameScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [playerX, setPlayerX] = useState(50)
  const [obstacles, setObstacles] = useState<GameObstacle[]>([])
  const playerXRef = useRef(50)
  const gameScoreRef = useRef(0)
  const collisionRef = useRef(false)
  const gameLauncherRef = useRef<HTMLButtonElement>(null)
  const gameCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const fitPage = () => {
      const scale =
        window.innerWidth >= 900 ? Math.min(1, window.innerHeight / 1152) : 1

      setPageScale(scale)
      setPageWidth(
        window.innerWidth >= 900
          ? window.innerWidth / scale
          : window.innerWidth,
      )
    }

    fitPage()
    window.addEventListener("resize", fitPage)
    return () => window.removeEventListener("resize", fitPage)
  }, [])

  useEffect(() => {
    playerXRef.current = playerX
  }, [playerX])

  useEffect(() => {
    if (!gameRunning) return

    const moveTimer = window.setInterval(() => {
      setObstacles((current) =>
        current
          .map((obstacle) => ({ ...obstacle, y: obstacle.y + 2.2 }))
          .filter((obstacle) => obstacle.y < 110),
      )
      setGameScore((current) => {
        const next = current + 1
        gameScoreRef.current = next
        return next
      })
    }, 50)

    const spawnTimer = window.setInterval(() => {
      setObstacles((current) => [
        ...current,
        {
          id: Date.now(),
          x: 14 + Math.random() * 72,
          y: -14,
        },
      ])
    }, 720)

    return () => {
      window.clearInterval(moveTimer)
      window.clearInterval(spawnTimer)
    }
  }, [gameRunning])

  useEffect(() => {
    if (!gameRunning) return

    const collided = obstacles.some(
      (obstacle) =>
        obstacle.y > 76 &&
        obstacle.y < 94 &&
        Math.abs(obstacle.x - playerXRef.current) < 11,
    )

    if (!collided || collisionRef.current) return

    collisionRef.current = true
    setGameRunning(false)
    setBestScore((currentBest) =>
      Math.max(currentBest, gameScoreRef.current),
    )
  }, [obstacles, gameRunning])

  useEffect(() => {
    if (!gameOpen) return

    gameCloseRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGameOpen(false)
        setGameRunning(false)
        gameLauncherRef.current?.focus()
        return
      }

      if (!gameRunning) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

      event.preventDefault()
      setPlayerX((current) =>
        Math.max(6, Math.min(94, current + (event.key === "ArrowLeft" ? -7 : 7))),
      )
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOpen, gameRunning])

  function startGame() {
    collisionRef.current = false
    gameScoreRef.current = 0
    setGameScore(0)
    setPlayerX(50)
    setObstacles([])
    setGameRunning(true)
  }

  function closeGame() {
    setGameOpen(false)
    setGameRunning(false)
    setObstacles([])
    setGameScore(0)
    gameScoreRef.current = 0
    collisionRef.current = false
    gameLauncherRef.current?.focus()
  }

  function movePlayer(amount: number) {
    if (!gameRunning) return
    setPlayerX((current) => Math.max(6, Math.min(94, current + amount)))
  }

  async function joinWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

    if (!valid) {
      setMessageTone("error")
      setMessage("Please enter a valid email address.")
      return
    }

    setIsSubmitting(true)
    setMessageTone("default")
    setMessage("Joining the waitlist…")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, company }),
      })
      const result = (await response.json()) as {
        alreadySubscribed?: boolean
        confirmationSent?: boolean
        message?: string
      }

      if (!response.ok) {
        throw new Error(result.message || "We couldn't add you right now.")
      }

      setEmail(normalizedEmail)
      setSubmitted(true)
      setMessageTone("success")

      if (result.alreadySubscribed) {
        setMessage(
          "You're already on the waitlist. We'll be in touch when aika is ready.",
        )
      } else if (result.confirmationSent === false) {
        setMessage(
          "Success — your email has been submitted. You're on the waitlist.",
        )
      } else {
        setMessage(
          "Success — your email has been submitted. Check your inbox for confirmation.",
        )
      }

      window.setTimeout(() => gameLauncherRef.current?.focus(), 0)
    } catch (error) {
      setMessageTone("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't add you right now. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="viewport-fit">
      <div
        className="site-shell"
        style={{ width: pageWidth, transform: `scale(${pageScale})` }}
      >
        <nav className="navigation" aria-label="Primary navigation">
          <img className="aika-logo" src={asset("949f2.png")} alt="aika" width={180} height={65} />
          <div className="launch-status">
            <img
              className="spinner"
              src={asset("529a6.png")}
              alt=""
              aria-hidden="true"
              width={21}
              height={21}
            />
            <span>IN THE MAKING</span>
          </div>
        </nav>

        <section className="invitation" aria-labelledby="waitlist-title">
          <div className="atmosphere" aria-hidden="true" />

          <div className="architecture" aria-hidden="true">
            {fins.map((fin) => (
              <img
                key={fin.src}
                className="fin"
                src={asset(fin.src)}
                alt=""
                loading="lazy"
                width={62.4}
                style={{
                  [fin.side]: `${(fin.offset / 1728) * 100}%`,
                  top: fin.top,
                  height: fin.height,
                }}
              />
            ))}
          </div>

          <div className="editorial-meta" aria-hidden="true">
            <span>[ AIKA / PRE-LAUNCH ]</span>
            <span>THE BEGINNING</span>
          </div>

          <div
            className="invitation-content"
            style={{
              transform: pageWidth >= 900 ? "scale(1.2)" : undefined,
              transformOrigin: "top center",
            }}
          >
            <div className="waitlist-status">
              <span className="open-signal" />
              <span>WAITLIST OPEN</span>
            </div>

            <h1 id="waitlist-title">
              <span>Something new.</span>
              <span>Worth the wait.</span>
            </h1>

            <p className="intro">
              <span>aika is taking shape.</span>
              <span>Join the waitlist. Be first to hear what comes next.</span>
            </p>

            <form
              id="waitlist-form"
              className="signup"
              onSubmit={joinWaitlist}
              noValidate
            >
              <label htmlFor="email">YOUR EMAIL ADDRESS</label>
              <div className="signup-controls">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setSubmitted(false)
                    setMessageTone("default")
                    setMessage(DEFAULT_MESSAGE)
                  }}
                  placeholder="you@example.com"
                  aria-describedby="form-message"
                  required
                />
                <button
                  type="submit"
                  disabled={submitted || isSubmitting}
                  aria-busy={isSubmitting}
                >
                  <span className="signup-submit-content">
                    {isSubmitting && (
                      <span className="submit-spinner" aria-hidden="true" />
                    )}
                    <span>
                      {submitted
                        ? "Joined"
                        : isSubmitting
                          ? "Joining…"
                          : "Join waitlist →"}
                    </span>
                  </span>
                </button>
              </div>
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <button
                ref={gameLauncherRef}
                className="game-inline-launcher"
                type="button"
                onClick={() => setGameOpen(true)}
                aria-haspopup="dialog"
              >
                <span className="game-launcher-signal" />
                PLAY A SIDE QUEST
              </button>
              <p
                id="form-message"
                className={`form-message ${
                  messageTone === "success"
                    ? "form-message-success"
                    : messageTone === "error"
                      ? "form-message-error"
                      : ""
                }`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            </form>
          </div>

          <div className="perspective" aria-hidden="true">
            <img src={asset("5688b.svg")} alt="" loading="lazy" width={1500} height={73.2} />
          </div>

          <div className="horizon-detail" aria-hidden="true">
            <span />
            <p>MORE TO COME</p>
            <span />
          </div>
        </section>

        <footer>
          <p>© aika {new Date().getFullYear()}</p>
          <p>A little anticipation goes a long way.</p>
          <a href="#waitlist-form">
            STAY CURIOUS
            <img src={asset("d06df.svg")} alt="" aria-hidden="true" width={19.2} height={19.2} />
          </a>
        </footer>
      </div>

      {gameOpen && (
        <aside className="mini-game">
          <div
            className="game-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-title"
          >
            <div className="game-header">
              <div>
                <p className="game-eyebrow">SIDE QUEST</p>
                <h2 id="game-title">Midnight delivery</h2>
              </div>
              <button
                ref={gameCloseRef}
                className="game-close"
                type="button"
                onClick={closeGame}
                aria-label="Close mini-game"
              >
                ×
              </button>
            </div>

            <div className="game-score">
              <span>SCORE {gameScore}</span>
              <span>BEST {bestScore}</span>
            </div>

            <div
              className={`game-arena ${gameRunning ? "is-running" : ""}`}
              onPointerMove={(event) => {
                if (!gameRunning) return
                const bounds = event.currentTarget.getBoundingClientRect()
                const nextX = ((event.clientX - bounds.left) / bounds.width) * 100
                setPlayerX(Math.max(6, Math.min(94, nextX)))
              }}
            >
              <div className="game-city" aria-hidden="true" />
              <div className="game-road" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              {obstacles.map((obstacle, index) => (
                <span
                  className={`game-obstacle car-variant-${index % 3}`}
                  key={obstacle.id}
                  style={{ left: `${obstacle.x}%`, top: `${obstacle.y}%` }}
                  aria-hidden="true"
                >
                  <span className="car-windshield" />
                  <span className="car-light car-light-left" />
                  <span className="car-light car-light-right" />
                </span>
              ))}
              <div
                className="game-player"
                style={{ left: `${playerX}%` }}
                aria-hidden="true"
              >
                <span className="rider-head" />
                <span className="rider-body" />
                <span className="delivery-box" />
                <span className="bike-frame" />
                <span className="bike-wheel bike-wheel-left" />
                <span className="bike-wheel bike-wheel-right" />
              </div>

              {!gameRunning && (
                <div className="game-overlay">
                  <p role="status" aria-live="polite">
                    {collisionRef.current
                      ? "Delivery delayed. Find another route."
                      : "Weave through traffic. Deliver on time."}
                  </p>
                  <button type="button" onClick={startGame}>
                    {collisionRef.current ? "TRY AGAIN" : "START RUN"}
                  </button>
                </div>
              )}
            </div>

            <div className="game-controls">
              <button
                type="button"
                onPointerDown={() => movePlayer(-8)}
                aria-label="Move left"
              >
                ←
              </button>
              <p>ARROWS OR DRAG</p>
              <button
                type="button"
                onPointerDown={() => movePlayer(8)}
                aria-label="Move right"
              >
                →
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

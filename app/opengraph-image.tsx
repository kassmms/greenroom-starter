import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Greenroom — software for independent music venues";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16, 185, 129, 0.14), transparent 60%), #faf7f0",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "system-ui",
        }}
      >
        {/* Mark + Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="64" height="64" viewBox="0 0 40 40">
            <defs>
              <linearGradient
                id="gr-bg"
                x1="0"
                y1="0"
                x2="40"
                y2="40"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#059669" />
                <stop offset="1" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="8" fill="url(#gr-bg)" />
            <rect x="7.5" y="14.5" width="4" height="11" rx="2" fill="white" />
            <rect x="14.5" y="11" width="4" height="18" rx="2" fill="white" />
            <rect x="21.5" y="9" width="4" height="22" rx="2" fill="white" />
            <rect x="28.5" y="16.5" width="4" height="7" rx="2" fill="white" />
          </svg>
          <span
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: "#1a1814",
              letterSpacing: "-0.02em",
            }}
          >
            Greenroom
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#047857",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Operating system for independent music venues
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 500,
              color: "#1a1814",
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
            }}
          >
            Bookings, settlement, advancing —
            <br />
            in one place.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

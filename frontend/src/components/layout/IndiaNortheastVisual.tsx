export default function IndiaNortheastVisual() {
  return (
    <div
      className="sidebar-coverage-card"
      style={{
        width: '100%',
        padding: '24px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#e8eef4',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* ---------- India map ---------- */}
      <div className="sidebar-map-visual" style={{ width: 96 }}>
        <svg
          viewBox="0 0 290 305"
          className="sidebar-india-svg"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <filter id="neGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Mainland India */}
          <path
            d="M66.7 5 L81.8 13 L96.8 20 L111.9 24 L120.3 35 L110.9 50 L106.2 63 L126.9 73
               L118.4 88 L131.6 94 L150.4 101 L167.3 107 L183.3 111 L193.6 110
               L192.7 103 L198.3 94 L201.2 104 L207.7 107 L230.3 106 L227.5 97
               L241.6 89 L256.6 82 L268.8 81 L270.7 90 L281.1 93 L277.3 98
               L268.8 103 L260.4 108 L255.7 120 L251 132 L248.2 136 L243.5 145
               L239.7 153 L236 155.5 L233.1 148 L233.1 138 L229.4 145 L224.7 145
               L222.8 139 L222.8 133 L230.3 131 L235 133 L233.1 125 L216.2 123
               L209.6 122 L209.6 114 L197.4 110 L193.6 117 L193.6 123 L201.2 131
               L198.3 139 L201.2 146 L202.1 155 L201.2 159 L190.8 158 L183.3 161
               L181.4 169 L176.7 176 L164.5 181 L156 191 L148.5 199 L140.1 205
               L138.2 210 L129.7 213 L120.3 220 L118.4 230 L120.3 240 L117.5 252
               L115.6 261 L116.1 272 L110 274 L107.2 282 L100.6 286 L94.5 294
               L88.4 291 L83.7 279 L81.8 270 L77.1 261 L69.6 247 L64.9 229
               L59.2 220 L54.5 207 L50.8 186 L48.9 173 L48.9 162 L47 152
               L44.2 158 L41.4 163 L32.9 168 L23.5 163 L15 153 L19.7 149
               L28.2 146 L18.8 145 L10.3 143 L7.5 138 L11.3 132 L24.4 132
               L32.9 128 L30.1 118 L25.4 109 L19.7 105 L27.3 95 L41.4 96
               L50.8 85 L55.5 76 L66.7 64 L65.8 53 L73.3 50 L62 43 L60.2 31
               L53.6 22 L48.9 12 L56.4 6 Z"
            fill="#3d4d60"
            stroke="#526579"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Northeast region – Sikkim + Seven Sisters */}
          <path
            d="M193.6 110 L192.7 103 L198.3 94 L201.2 104 L207.7 107 L230.3 106
               L227.5 97 L241.6 89 L256.6 82 L268.8 81 L270.7 90 L281.1 93
               L277.3 98 L268.8 103 L260.4 108 L255.7 120 L251 132 L248.2 136
               L243.5 145 L239.7 153 L236 155.5 L233.1 148 L233.1 138 L229.4 145
               L224.7 145 L222.8 139 L222.8 133 L230.3 131 L235 133 L233.1 125
               L216.2 123 L209.6 122 L209.6 114 L197.4 110 Z"
            fill="#2dd4bf"
            stroke="#7cf0e0"
            strokeWidth="1.2"
            strokeLinejoin="round"
            filter="url(#neGlow)"
          />
        </svg>
      </div>

      {/* ---------- Headline ---------- */}
      <div
        style={{
          marginTop: 20,
          fontSize: 14,
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        Safer Communities
        <br />
        Stronger Northeast
      </div>

      {/* ---------- Divider ---------- */}
      <div
        style={{
          width: 40,
          height: 1,
          background: '#2e3f52',
          margin: '14px auto 10px',
        }}
      />

      {/* ---------- Sub text ---------- */}
      <div
        className="sidebar-coverage-footer"
        style={{ fontSize: 9, lineHeight: 1.45, color: '#a9b6c4' }}
      >
        Safer Communities,
        <br />
        for a Stronger Northeast
      </div>
    </div>
  );
}
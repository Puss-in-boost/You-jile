export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <span className="brand-mark">
        <svg
          width="31"
          height="31"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 10C10 6 30 6 30 10L28 13C34 19 35 29 29 32C24 35 15 35 10 32C4 28 6 19 12 13L10 10Z"
            fill="#d5ebad"
          />
          <path
            d="M14 12h12"
            stroke="#285447"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 23c3 5 9 5 12 0"
            stroke="#285447"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="20" r="1.5" fill="#285447" />
          <circle cx="26" cy="20" r="1.5" fill="#285447" />
        </svg>
      </span>
      {!small && (
        <span>
          又寄了<span className="brand-dot">.</span>
          <small>钱有去处，生活有数</small>
        </span>
      )}
    </div>
  );
}

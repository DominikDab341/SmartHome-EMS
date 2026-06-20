export type IconName =
  | 'dashboard'
  | 'devices'
  | 'analytics'
  | 'residents'
  | 'battery'
  | 'solar'
  | 'grid'
  | 'wallet'
  | 'weather'
  | 'play'
  | 'logout'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'chevron'
  | 'menu'
  | 'close'
  | 'check'
  | 'bolt'

type IconProps = {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20 }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    devices: <><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M9 6h6M9 18h6" /><circle cx="12" cy="12" r="2" /></>,
    analytics: <><path d="M4 19V9M10 19V4M16 19v-6M22 19H2" /></>,
    residents: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    battery: <><rect x="2" y="6" width="18" height="12" rx="3" /><path d="M22 10v4M6 10v4M10 10v4M14 10v4" /></>,
    solar: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
    grid: <><path d="M12 2 8 8h3l-2 6 7-8h-4l2-4Z" /><path d="M5 22h14M7 18h10M9 14l-2 4M15 14l2 4" /></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" /><path d="M16 14h.01" /></>,
    weather: <><path d="M17.5 19H9a7 7 0 1 1 6.71-9H17.5a4.5 4.5 0 1 1 0 9Z" /><path d="M12 2v2M4.93 4.93l1.42 1.42M2 12h2" /></>,
    play: <><circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    bolt: <path d="m13 2-9 12h8l-1 8 9-12h-8Z" />,
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

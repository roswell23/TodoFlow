import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

// Clean SVGs for theme options (no emoji)
function SunIcon({ className = 'theme-icon' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="3.75" />
      <path d="M10 2v2m0 12v2m-8-8h2m12 0h2m-2.6-5.4l-1.4 1.4m-8 8l-1.4 1.4m0-10.8l1.4 1.4m8 8l1.4 1.4" />
    </svg>
  )
}

function MoonIcon({ className = 'theme-icon' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.2 13.5A7.5 7.5 0 1 1 8.5 2.8a6.5 6.5 0 0 0 8.7 10.7z" />
    </svg>
  )
}

function MonitorIcon({ className = 'theme-icon' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="10.5" rx="2" />
      <path d="M7 17h6m-3-3v3" />
    </svg>
  )
}

function CheckIcon({ className = 'theme-check-icon' }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 7.5l3 3 6-6" />
    </svg>
  )
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
]

export default function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  // Handle keyboard events when dropdown is open
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => {
          const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.value === theme)
          const targetIndex = currentIndex >= 0 ? currentIndex : 0
          itemRefs.current[targetIndex]?.focus()
        }, 10)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const focusedIndex = itemRefs.current.findIndex((el) => el === document.activeElement)
      const nextIndex = (focusedIndex + 1) % THEME_OPTIONS.length
      itemRefs.current[nextIndex]?.focus()
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const focusedIndex = itemRefs.current.findIndex((el) => el === document.activeElement)
      const prevIndex = (focusedIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length
      itemRefs.current[prevIndex]?.focus()
      return
    }

    if (e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  const handleSelect = (mode) => {
    setTheme(mode)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  // Determine current active display icon
  const CurrentIcon =
    theme === 'system'
      ? MonitorIcon
      : theme === 'dark'
      ? MoonIcon
      : SunIcon

  const themeDisplayLabel =
    theme === 'system'
      ? `System (${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`
      : theme === 'dark'
      ? 'Dark'
      : 'Light'

  return (
    <div className="theme-toggle-container" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={`theme-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Theme: ${themeDisplayLabel}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="theme-icon" />
      </button>

      {isOpen && (
        <div className="theme-menu" role="menu" aria-label="Theme selection">
          <div className="theme-menu-header" aria-hidden="true">
            Theme
          </div>
          <div className="theme-menu-items">
            {THEME_OPTIONS.map((opt, idx) => {
              const isSelected = theme === opt.value
              const OptionIcon = opt.Icon
              return (
                <button
                  key={opt.value}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`theme-menu-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <OptionIcon className="theme-option-icon" />
                  <span className="theme-option-label">{opt.label}</span>
                  {isSelected && <CheckIcon className="theme-check-icon" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

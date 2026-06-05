import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HealthBadge from './HealthBadge'

describe('HealthBadge', () => {
  it('shows 正常 for normal', () => {
    render(<HealthBadge status="normal" />)
    expect(screen.getByText('正常')).toBeInTheDocument()
  })

  it('shows 注意 for warning', () => {
    render(<HealthBadge status="warning" />)
    expect(screen.getByText('注意')).toBeInTheDocument()
  })

  it('shows 異常 for critical', () => {
    render(<HealthBadge status="critical" />)
    expect(screen.getByText('異常')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressRing from './ProgressRing'

describe('ProgressRing', () => {
  it('displays the percentage value', () => {
    render(<ProgressRing value={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays the label when provided', () => {
    render(<ProgressRing value={50} label="整體進度" />)
    expect(screen.getByText('整體進度')).toBeInTheDocument()
  })
})

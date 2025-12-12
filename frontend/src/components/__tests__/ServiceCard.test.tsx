/**
 * Unit tests for ServiceCard component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ServiceCard } from '../ServiceCard'
import { testServices } from '../../test/fixtures/test-data'

describe('ServiceCard', () => {
  it('renders service information', () => {
    const service = testServices[0]
    render(<ServiceCard service={service} />)
    
    expect(screen.getByText(service.title)).toBeInTheDocument()
    expect(screen.getByText(service.description)).toBeInTheDocument()
  })

  it('displays service type text', () => {
    const service = testServices[0]
    render(<ServiceCard service={service} />)
    
    expect(screen.getByText(service.type === 'Offer' ? /offering/i : /seeking/i)).toBeInTheDocument()
  })

  it('displays location information for in-person services', () => {
    const service = { ...testServices[0], location_type: 'In-Person', location_area: 'Beşiktaş' }
    render(<ServiceCard service={service} />)
    
    expect(screen.getByText(/beşiktaş/i)).toBeInTheDocument()
  })

  it('displays duration and participants', () => {
    const service = testServices[0]
    render(<ServiceCard service={service} />)

    const spans = screen.getAllByText((_, element) => element?.tagName.toLowerCase() === 'span')
    const spanTexts = spans
      .map((element) => (element.textContent ?? '').replace(/\s+/g, ''))
      .filter(Boolean)

    expect(spanTexts).toContain(`${service.duration}h`)
    expect(spanTexts).toContain(`${service.max_participants}max`)
  })

  it('calls onClick when clicked', () => {
    const service = testServices[0]
    const onClick = vi.fn()
    render(<ServiceCard service={service} onClick={onClick} />)

    fireEvent.click(screen.getByText(service.title))
    expect(onClick).toHaveBeenCalledWith(service)
  })
})

/**
 * Unit tests for ServiceCard component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ServiceCard from '../ServiceCard'
import { testServices } from '../../test/fixtures/test-data'

describe('ServiceCard', () => {
  it('renders service information', () => {
    const service = testServices[0]
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    )
    
    expect(screen.getByText(service.title)).toBeInTheDocument()
    expect(screen.getByText(service.description)).toBeInTheDocument()
  })

  it('displays service type badge', () => {
    const service = testServices[0]
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    )
    
    expect(screen.getByText(service.type)).toBeInTheDocument()
  })

  it('displays location information for in-person services', () => {
    const service = { ...testServices[0], location_type: 'In-Person', location_area: 'Beşiktaş' }
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    )
    
    expect(screen.getByText(/beşiktaş/i)).toBeInTheDocument()
  })

  it('displays duration and participants', () => {
    const service = testServices[0]
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    )
    
    expect(screen.getByText(new RegExp(`${service.duration}`, 'i'))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${service.max_participants}`, 'i'))).toBeInTheDocument()
  })

  it('links to service detail page', () => {
    const service = testServices[0]
    render(
      <BrowserRouter>
        <ServiceCard service={service} />
      </BrowserRouter>
    )
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/services/${service.id}`)
  })
})

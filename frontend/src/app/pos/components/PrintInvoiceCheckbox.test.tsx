import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrintInvoiceCheckbox, loadPrintPreference, savePrintPreference } from './PrintInvoiceCheckbox'

describe('PrintInvoiceCheckbox', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('renders with correct label', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={true} onChange={onChange} />)
    
    expect(screen.getByText('In hóa đơn')).toBeInTheDocument()
  })

  it('is checked by default when checked prop is true', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={true} onChange={onChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('is unchecked when checked prop is false', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={false} onChange={onChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={true} onChange={onChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('is disabled when disabled prop is true', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={true} onChange={onChange} disabled={true} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('saves preference to localStorage when changed', () => {
    const onChange = vi.fn()
    render(<PrintInvoiceCheckbox checked={true} onChange={onChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(localStorage.getItem('pos_print_invoice_preference')).toBe('false')
  })
})

describe('loadPrintPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns true by default when no value is stored', () => {
    expect(loadPrintPreference()).toBe(true)
  })

  it('returns true when stored value is "true"', () => {
    localStorage.setItem('pos_print_invoice_preference', 'true')
    expect(loadPrintPreference()).toBe(true)
  })

  it('returns false when stored value is "false"', () => {
    localStorage.setItem('pos_print_invoice_preference', 'false')
    expect(loadPrintPreference()).toBe(false)
  })
})

describe('savePrintPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves true as string "true"', () => {
    savePrintPreference(true)
    expect(localStorage.getItem('pos_print_invoice_preference')).toBe('true')
  })

  it('saves false as string "false"', () => {
    savePrintPreference(false)
    expect(localStorage.getItem('pos_print_invoice_preference')).toBe('false')
  })
})

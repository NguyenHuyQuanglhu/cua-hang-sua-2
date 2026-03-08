"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { safeStorage } from "@/lib/error-handling"

const STORAGE_KEY = 'pos_print_invoice_preference'

interface PrintInvoiceCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * Load print preference from localStorage with error handling
 * @returns boolean - true if should print (default), false otherwise
 * 
 * Handles localStorage errors by falling back to in-memory storage
 */
export const loadPrintPreference = (): boolean => {
  if (typeof window === 'undefined') return true
  
  const stored = safeStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

/**
 * Save print preference to localStorage with error handling
 * @param checked - boolean value to save
 * 
 * Handles localStorage errors by falling back to in-memory storage
 */
export const savePrintPreference = (checked: boolean): void => {
  if (typeof window === 'undefined') return
  
  safeStorage.setItem(STORAGE_KEY, String(checked))
}

/**
 * PrintInvoiceCheckbox Component
 * 
 * A checkbox component that allows users to control whether to show the print invoice dialog
 * after completing a payment. The preference is persisted in localStorage.
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6, 5.1, 5.4, 5.5
 */
export function PrintInvoiceCheckbox({
  checked,
  onChange,
  disabled = false,
  className
}: PrintInvoiceCheckboxProps) {
  const [isAnimating, setIsAnimating] = React.useState(false)

  const handleChange = (newChecked: boolean) => {
    // Visual feedback animation
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
    
    // Save to localStorage
    savePrintPreference(newChecked)
    
    // Call parent onChange
    onChange(newChecked)
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center space-x-2 transition-all duration-300",
        isAnimating && "scale-105",
        className
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="print-invoice"
                checked={checked}
                onCheckedChange={handleChange}
                disabled={disabled}
                className={cn(
                  "transition-all duration-200",
                  isAnimating && "ring-2 ring-primary ring-offset-2"
                )}
              />
              <Label
                htmlFor="print-invoice"
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none",
                  isAnimating && "text-primary"
                )}
              >
                In hóa đơn
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tự động hiển thị hộp thoại in hóa đơn sau khi thanh toán thành công</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

/**
 * Hook to manage print invoice preference
 * Automatically loads the preference from localStorage on mount
 */
export function usePrintInvoicePreference() {
  const [shouldPrint, setShouldPrint] = React.useState(true)

  React.useEffect(() => {
    setShouldPrint(loadPrintPreference())
  }, [])

  const updatePreference = React.useCallback((checked: boolean) => {
    setShouldPrint(checked)
    savePrintPreference(checked)
  }, [])

  return {
    shouldPrint,
    setShouldPrint: updatePreference
  }
}

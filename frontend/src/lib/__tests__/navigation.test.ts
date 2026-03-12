import { getPostShiftRedirectPath, shouldRedirectToDashboard } from '../navigation'
import type { UserRole } from '../types'

describe('Navigation utilities', () => {
  describe('getPostShiftRedirectPath', () => {
    it('should redirect owner to dashboard', () => {
      expect(getPostShiftRedirectPath('owner')).toBe('/dashboard')
    })

    it('should redirect company_manager to dashboard', () => {
      expect(getPostShiftRedirectPath('company_manager')).toBe('/dashboard')
    })

    it('should redirect store_manager to dashboard', () => {
      expect(getPostShiftRedirectPath('store_manager')).toBe('/dashboard')
    })

    it('should redirect salesperson to login', () => {
      expect(getPostShiftRedirectPath('salesperson')).toBe('/login')
    })

    it('should redirect unknown role to login', () => {
      expect(getPostShiftRedirectPath('unknown' as UserRole)).toBe('/login')
    })
  })

  describe('shouldRedirectToDashboard', () => {
    it('should return true for management roles', () => {
      expect(shouldRedirectToDashboard('owner')).toBe(true)
      expect(shouldRedirectToDashboard('company_manager')).toBe(true)
      expect(shouldRedirectToDashboard('store_manager')).toBe(true)
    })

    it('should return false for salesperson', () => {
      expect(shouldRedirectToDashboard('salesperson')).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(shouldRedirectToDashboard('unknown' as UserRole)).toBe(false)
    })
  })
})
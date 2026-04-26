/**
 * Shared TypeScript types & interfaces.
 * Place domain-specific types here for reuse across the app.
 */

export interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

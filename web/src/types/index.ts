

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

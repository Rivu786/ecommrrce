import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
};

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: 999,
  padding: '0.7rem 1.25rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid transparent',
};

const variants: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #C9A227 0%, #9A7A14 100%)',
    color: '#1A1405',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'rgba(201,162,39,0.35)',
    color: '#E8EDF7',
  },
};

/** Minimal shared Button placeholder for OmniCommerce apps. */
export function Button({ children, variant = 'primary', style, ...rest }: ButtonProps) {
  return (
    <button type="button" style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

export default Button;

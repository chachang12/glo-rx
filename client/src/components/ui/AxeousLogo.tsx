import { SVGProps } from 'react'

interface AxeousLogoProps extends SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
}

const AxeousLogo = ({ size, color = 'currentColor', ...props }: AxeousLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 740.35 740.37"
    width={size}
    height={size}
    {...props}
  >
    <path
      fill={color}
      d="M739.85 229.52V1.21L315.03 426.04 121.35 232.36l-.15 162.97L233.47 507.6 1.21 739.87H229.5l118.12-118.12 118.12 118.12h274.11V471.22l-190.46 189.2-120.22-120.23 310.68-310.67z"
    />
  </svg>
)

export default AxeousLogo

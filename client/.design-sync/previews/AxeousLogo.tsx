import { AxeousLogo } from 'glo-practice-tester'
import { Surface } from './_frame'

export const Default = () => (
  <Surface>
    <AxeousLogo size={96} color="#f3f5f9" />
  </Surface>
)

export const Sizes = () => (
  <Surface>
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <AxeousLogo size={32} color="#f3f5f9" />
      <AxeousLogo size={56} color="#f3f5f9" />
      <AxeousLogo size={88} color="#f3f5f9" />
    </div>
  </Surface>
)

export const Accents = () => (
  <Surface>
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <AxeousLogo size={64} color="#6e9cc7" />
      <AxeousLogo size={64} color="#a78bfa" />
      <AxeousLogo size={64} color="#6aa8ff" />
    </div>
  </Surface>
)

import { PageLoader } from 'glo-practice-tester'
import { Surface } from './_frame'

// PageLoader is a centered spinning ring (brand-blue). It animates
// continuously; the static screenshot captures one frame of the spin.
export const Default = () => (
  <Surface style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <PageLoader />
  </Surface>
)

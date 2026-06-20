import { UserAvatar } from 'glo-practice-tester'
import { Surface } from './_frame'

export const Sizes = () => (
  <Surface>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <UserAvatar name="Jordan Lee" size="sm" />
      <UserAvatar name="Jordan Lee" size="md" />
      <UserAvatar name="Jordan Lee" size="lg" />
    </div>
  </Surface>
)

export const Roster = () => (
  <Surface>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <UserAvatar name="Priya Nair" />
      <UserAvatar name="Marcus Bell" />
      <UserAvatar name="Sofia Ramirez" />
      <UserAvatar name="Wei Chen" />
      <UserAvatar name="Amara Okafor" />
    </div>
  </Surface>
)

export const SingleNameAndFallback = () => (
  <Surface>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <UserAvatar name="Cleo" size="lg" />
      <UserAvatar name={null} size="lg" />
    </div>
  </Surface>
)

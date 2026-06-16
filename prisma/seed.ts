import crypto from 'crypto'
import { db } from '../src/lib/db'
import { TRAINING_MISSIONS } from '../src/lib/mission-seed-data'

const HASH_PREFIX = 'scrypt'
const KEY_LENGTH = 64

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')

  const hash = crypto
    .scryptSync(password, salt, KEY_LENGTH)
    .toString('hex')

  return `${HASH_PREFIX}$${salt}$${hash}`
}

async function main() {
  console.log('🧹 Clearing existing data...')

  await db.gameLog.deleteMany()
  await db.mission.deleteMany()
  await db.gameSession.deleteMany()
  await db.team.deleteMany()
  await db.gameState.deleteMany()
  await db.user.deleteMany()

  console.log('✅ Data cleared')

  console.log('👤 Creating admin user...')

  const admin = await db.user.create({
    data: {
      email: 'admin@cyber.com',
      password: hashPassword('admin123'),
      role: 'admin',
      team: '',
    },
  })

  console.log(`  ✓ Admin created: ${admin.email}`)

  console.log('🎮 Creating game state...')

  const gameState = await db.gameState.create({
    data: {
      phase: 'DEFENSE',
      vulnerabilities: 3,
    },
  })

  console.log(`  ✓ GameState created (id: ${gameState.id})`)

  console.log('🔴 Creating Team A...')

  const teamA = await db.team.create({
    data: {
      name: 'teamA',
      ssid: 'Shlool_WiFi',
      displayName: 'AL-SHLOOL',
      password: 'S1234',
      attackScore: 0,
      defenseScore: 0,
      gameStateId: gameState.id,
    },
  })

  console.log(`  ✓ Team A created: ${teamA.displayName}`)

  console.log('🔵 Creating Team B...')

  const teamB = await db.team.create({
    data: {
      name: 'teamB',
      ssid: 'Yassen_WiFi',
      displayName: 'BANI YASSEN',
      password: 'Y1234',
      attackScore: 0,
      defenseScore: 0,
      gameStateId: gameState.id,
    },
  })

  console.log(`  ✓ Team B created: ${teamB.displayName}`)

  console.log('🎯 Creating missions...')

  for (const mission of TRAINING_MISSIONS) {
    await db.mission.create({ data: mission })

    console.log(
      `  ✓ Mission: ${mission.title} (${mission.type}/${mission.difficulty} - ${mission.points}pts)`
    )
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log('  - 1 admin user')
  console.log('  - 1 game state')
  console.log('  - 2 teams')
  console.log(`  - ${TRAINING_MISSIONS.length} missions`)
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error)
    await db.$disconnect()
    process.exit(1)
  })

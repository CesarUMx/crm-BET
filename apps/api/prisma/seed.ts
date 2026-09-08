import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const rawPassword = process.env.SEED_ADMIN_PASSWORD
  if (!rawPassword) {
    throw new Error('SEED_ADMIN_PASSWORD no está definida en .env')
  }

  const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id })

  const admin = await prisma.user.upsert({
    where: { email: 'cortiz@mondragonmexico.edu.mx' },
    update: {},
    create: {
      email: 'cortiz@mondragonmexico.edu.mx',
      name: 'Cesar Ortiz',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: true,
    },
  })

  console.log(`✓ Super Admin listo: ${admin.email} (mustChangePassword=${admin.mustChangePassword})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

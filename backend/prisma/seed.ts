import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProcessStatus, Role, SectionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SECTION_NAMES: Record<number, string> = {
  1: 'Информация о процессе',
  2: 'Цель обработки и физ. лица',
  3: 'Сотрудники и отделы',
  4: 'Источники ПДн',
  5: 'Перечень данных, основания, сроки',
  6: 'Хранение бумажных документов',
  7: 'Информационные системы',
  8: 'Третьи лица',
  9: 'Дополнительная информация',
};

function emptySections() {
  return Array.from({ length: 9 }, (_, i) => ({
    sectionNumber: i + 1,
    sectionName: SECTION_NAMES[i + 1]!,
    status: SectionStatus.NOT_FILLED,
    data: {},
  }));
}

const emptyCompanyFields = {
  ogrn: null,
  okved: null,
  activityType: null,
  ceoName: null,
  ceoPosition: null,
  phone: null,
  email: null,
  legalAddress: null,
  postalAddress: null,
  city: null,
  pdStartDate: null,
  isOperator: false,
  hasCrossBorder: false,
  hasDirectories: false,
  contactEmail: null,
  offices: [] as const,
  sites: [] as const,
  apps: [] as const,
};

const DEMO_PROCESSES = [
  {
    name: 'Доставка товара клиентам',
    tags: ['Клиенты'],
    status: ProcessStatus.ACCEPTED,
    sentTo: 'Петров И.В.',
    sentAt: new Date('2026-04-10'),
  },
  {
    name: 'Кадровый учёт',
    tags: ['HR'],
    status: ProcessStatus.REVIEW,
    sentTo: 'Сидорова А.К.',
    sentAt: new Date('2026-04-08'),
  },
  {
    name: 'Маркетинговые рассылки',
    tags: ['Маркетинг'],
    status: ProcessStatus.NOT_SENT,
    sentTo: null,
    sentAt: null,
  },
  {
    name: 'Бухгалтерский учёт',
    tags: ['Финансы'],
    status: ProcessStatus.ACCEPTED,
    sentTo: 'Козлов Д.М.',
    sentAt: new Date('2026-04-05'),
  },
  {
    name: 'Видеонаблюдение',
    tags: ['Безопасность'],
    status: ProcessStatus.RETURNED,
    sentTo: 'Иванов П.С.',
    sentAt: new Date('2026-04-01'),
  },
] as const;

const COMPANIES = [
  { name: 'ПАО «Самолёт»', shortName: 'ПАО Самолёт', inn: '5024178470' },
  { name: 'ООО «Самолёт Девелопмент»', shortName: 'Самолёт Дев', inn: '7709876543' },
  { name: 'ООО «Самолёт Плюс»', shortName: 'Самолёт Плюс', inn: '5024198765' },
];

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@samolet.ru' },
    update: {},
    create: {
      email: 'admin@samolet.ru',
      password: passwordHash,
      name: 'Администратор',
      role: Role.ADMIN,
    },
  });

  await prisma.anketaInvite.deleteMany({});
  await prisma.processInvite.deleteMany({});
  await prisma.processSection.deleteMany({});
  await prisma.process.deleteMany({});
  await prisma.companyResponsible.deleteMany({});
  await prisma.rknDocument.deleteMany({});
  await prisma.rknNotification.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.monitorEvent.deleteMany({});
  await prisma.generatedDocument.deleteMany({});

  for (const company of COMPANIES) {
    await prisma.company.upsert({
      where: { inn: company.inn },
      update: { ...company, ...emptyCompanyFields },
      create: { ...company, ...emptyCompanyFields },
    });
  }

  const pao = await prisma.company.findUnique({ where: { inn: '5024178470' } });
  if (pao) {
    for (const proc of DEMO_PROCESSES) {
      await prisma.process.create({
        data: {
          companyId: pao.id,
          name: proc.name,
          tags: [...proc.tags],
          status: proc.status,
          sentTo: proc.sentTo,
          sentAt: proc.sentAt,
          sections: { create: emptySections() },
        },
      });
    }
  }

  console.log('Seed completed. Admin: admin@samolet.ru / admin123');
  console.log('Companies created without anketa data — demo processes added for ПАО «Самолёт».');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import { PrismaClient, ProcessStatus, SectionStatus, RknStatus, JournalType, JournalStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

function makeSections(data: Record<number, { status: SectionStatus; data: object }>) {
  return Array.from({ length: 9 }, (_, i) => {
    const n = i + 1;
    const s = data[n] ?? { status: SectionStatus.NOT_FILLED, data: {} };
    return {
      sectionNumber: n,
      sectionName: SECTION_NAMES[n]!,
      status: s.status,
      data: s.data,
    };
  });
}

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

  const company1 = await prisma.company.upsert({
    where: { inn: '5024178470' },
    update: {},
    create: {
      name: 'ПАО «Самолёт»',
      shortName: 'ПАО Самолёт',
      inn: '5024178470',
      ogrn: '1155024003820',
      okved: '41.20',
      activityType: 'Строительство',
      ceoName: 'Антонов М.А.',
      ceoPosition: 'Генеральный директор',
      phone: '+7(495)150-51-51',
      email: 'info@samolet.ru',
      legalAddress: '143421, МО, Красногорский р-н, автодорога Балтия, 26 км',
      postalAddress: '',
      city: 'Красногорск',
      pdStartDate: new Date('2015-04-01'),
      isOperator: true,
      hasCrossBorder: false,
      contactEmail: 'e.mayer@samolet.ru',
      offices: [{ name: 'Головной офис', address: 'г. Москва, ул. 2-я Звенигородская, д. 13, стр. 42' }],
      sites: [{ name: 'samolet.ru', url: 'https://samolet.ru' }],
      apps: [{ name: 'Самолёт+', url: 'https://apps.apple.com/samolet' }],
    },
  });

  const company2 = await prisma.company.upsert({
    where: { inn: '7709876543' },
    update: {},
    create: {
      name: 'ООО «Самолёт Девелопмент»',
      shortName: 'Самолёт Дев',
      inn: '7709876543',
      activityType: 'Строительство',
    },
  });

  const company3 = await prisma.company.upsert({
    where: { inn: '5024198765' },
    update: {},
    create: {
      name: 'ООО «Самолёт Плюс»',
      shortName: 'Самолёт Плюс',
      inn: '5024198765',
      okved: '62.01',
      activityType: 'IT',
    },
  });

  await prisma.companyResponsible.deleteMany({ where: { companyId: company1.id } });
  await prisma.companyResponsible.create({
    data: {
      companyId: company1.id,
      role: 'organizer',
      fio: 'Майер Е.В.',
      position: 'DPO',
      email: 'e.mayer@samolet.ru',
      phone: '+7(495)150-51-52',
      isSecurity: true,
      controlsCompliance: true,
      informsEmployees: true,
      handlesRequests: true,
    },
  });

  await prisma.process.deleteMany({ where: { companyId: company1.id } });

  const processes = [
    {
      name: 'Доставка товара клиентам',
      tags: ['Клиенты'],
      status: ProcessStatus.ACCEPTED,
      sentTo: 'Петров И.В.',
      sentAt: new Date('2026-04-10'),
      sections: makeSections({
        1: { status: SectionStatus.FILLED, data: { description: 'Организация доставки товаров клиентам', contactName: 'Петров И.В.', contactPosition: 'Начальник отдела логистики', contactEmail: 'petrov@samolet.ru' } },
        2: { status: SectionStatus.FILLED, data: { macroGoal: 'Ведение основной деятельности', goal: 'Доставка товара клиентам', persons: 'Клиенты', count: 'less100k', hasIncapable: false } },
        3: { status: SectionStatus.NOT_FILLED, data: {} },
        4: { status: SectionStatus.FILLED, data: { sources: ['От субъекта', 'Из ИС'] } },
        5: { status: SectionStatus.FILLED, data: { pdCategories: ['ФИО', 'адрес доставки', 'телефон', 'email'], specialCategories: false, biometric: false, consentRequired: true, legalBasis: 'Договор', actions: ['сбор', 'хранение', 'передача'], retentionPeriod: '5 лет' } },
        6: { status: SectionStatus.FILLING, data: {} },
        7: { status: SectionStatus.FILLING, data: {} },
        8: { status: SectionStatus.FILLED, data: { thirdParties: ['Курьерская служба'] } },
        9: { status: SectionStatus.FILLED, data: {} },
      }),
    },
    {
      name: 'Кадровый учёт',
      tags: ['HR'],
      status: ProcessStatus.REVIEW,
      sentTo: 'Сидорова А.К.',
      sentAt: new Date('2026-04-08'),
      sections: makeSections({
        1: { status: SectionStatus.FILLED, data: { description: 'Ведение кадрового делопроизводства', contactName: 'Сидорова А.К.', contactPosition: 'Начальник HR', contactEmail: 'sidorova@samolet.ru' } },
        2: { status: SectionStatus.FILLED, data: { macroGoal: 'Управление персоналом', goal: 'Ведение кадрового учёта', persons: 'Сотрудники', count: 'less10k', hasIncapable: false } },
        4: { status: SectionStatus.FILLED, data: { sources: ['От субъекта'] } },
        5: { status: SectionStatus.FILLED, data: { pdCategories: ['ФИО', 'паспорт', 'СНИЛС', 'ИНН', 'адрес', 'телефон'], specialCategories: false, biometric: false, consentRequired: true, legalBasis: 'Трудовой договор', actions: ['сбор', 'хранение', 'систематизация'], retentionPeriod: '75 лет' } },
      }),
    },
    {
      name: 'Маркетинговые рассылки',
      tags: ['Маркетинг'],
      status: ProcessStatus.NOT_SENT,
      sections: makeSections({}),
    },
    {
      name: 'Бухгалтерский учёт',
      tags: ['Финансы'],
      status: ProcessStatus.ACCEPTED,
      sentTo: 'Козлов Д.М.',
      sentAt: new Date('2026-04-05'),
      sections: makeSections({
        1: { status: SectionStatus.FILLED, data: { description: 'Расчёт заработной платы и отчётность' } },
        2: { status: SectionStatus.FILLED, data: { macroGoal: 'Финансовый учёт', goal: 'Расчёт зарплаты', persons: 'Сотрудники', count: 'less10k' } },
        3: { status: SectionStatus.FILLED, data: {} },
        4: { status: SectionStatus.FILLED, data: {} },
        5: { status: SectionStatus.FILLED, data: {} },
        7: { status: SectionStatus.FILLED, data: {} },
        9: { status: SectionStatus.FILLED, data: {} },
      }),
    },
    {
      name: 'Видеонаблюдение',
      tags: ['Безопасность'],
      status: ProcessStatus.RETURNED,
      sentTo: 'Иванов П.С.',
      sentAt: new Date('2026-04-01'),
      sections: makeSections({
        1: { status: SectionStatus.FILLED, data: { description: 'Обеспечение безопасности объектов' } },
        2: { status: SectionStatus.FILLING, data: {} },
      }),
    },
  ];

  for (const p of processes) {
    await prisma.process.create({
      data: {
        companyId: company1.id,
        name: p.name,
        tags: p.tags,
        status: p.status,
        sentTo: p.sentTo ?? null,
        sentAt: p.sentAt ?? null,
        sections: { create: p.sections },
      },
    });
  }

  await prisma.rknNotification.deleteMany({});
  const rkn1 = await prisma.rknNotification.create({
    data: {
      companyId: company1.id,
      status: RknStatus.SUBMITTED,
      submitDate: new Date('2026-01-15'),
      changeDate: new Date('2026-04-10'),
    },
  });
  await prisma.rknDocument.createMany({
    data: [
      { notificationId: rkn1.id, fileName: 'Уведомление_ПАО_Самолёт_15012026.pdf', filePath: 'uploads/placeholder.pdf', isCurrent: true, version: 2 },
      { notificationId: rkn1.id, fileName: 'Уведомление_ПАО_Самолёт_10012025.pdf', filePath: 'uploads/placeholder_old.pdf', isCurrent: false, version: 1 },
    ],
  });

  const rkn2 = await prisma.rknNotification.create({
    data: {
      companyId: company2.id,
      status: RknStatus.SUBMITTED,
      submitDate: new Date('2026-02-20'),
      changeDate: new Date('2026-02-20'),
      documents: {
        create: [{ fileName: 'Уведомление_СамолётДев_20022026.pdf', filePath: 'uploads/placeholder_dev.pdf', isCurrent: true }],
      },
    },
  });

  await prisma.rknNotification.create({
    data: { companyId: company3.id, status: RknStatus.NOT_SUBMITTED },
  });

  await prisma.journalEntry.deleteMany({});
  await prisma.journalEntry.createMany({
    data: [
      { companyId: company1.id, type: JournalType.SUBJECT, dateIn: new Date('2026-04-12'), dateOut: new Date('2026-04-15'), sender: 'Иванов А.П.', content: 'Запрос на предоставление информации об обрабатываемых ПДн', answer: 'Предоставлена выписка из реестра процессов обработки ПДн', status: JournalStatus.CLOSED },
      { companyId: company2.id, type: JournalType.SUBJECT, dateIn: new Date('2026-04-08'), dateOut: new Date('2026-04-12'), sender: 'Петрова М.И.', content: 'Запрос на удаление ПДн из системы рассылок', answer: 'ПДн удалены, уведомление направлено субъекту', status: JournalStatus.CLOSED },
      { companyId: company1.id, type: JournalType.SUBJECT, dateIn: new Date('2026-04-01'), sender: 'Сергеев К.Л.', content: 'Запрос на уточнение целей обработки ПДн', status: JournalStatus.IN_PROGRESS },
      { companyId: company1.id, type: JournalType.RKN, dateIn: new Date('2026-03-20'), dateOut: new Date('2026-03-25'), sender: 'РКН (Управление по ЦФО)', content: 'Запрос о соответствии порядка обработки ПДн требованиям 152-ФЗ', answer: 'Направлен ответ с приложением документов', status: JournalStatus.CLOSED },
      { companyId: company2.id, type: JournalType.RKN, dateIn: new Date('2026-02-15'), dateOut: new Date('2026-02-20'), sender: 'РКН (Управление по ЦФО)', content: 'Уведомление о проведении плановой проверки', answer: 'Подготовлен пакет документов для проверки', status: JournalStatus.CLOSED },
    ],
  });

  await prisma.monitorEvent.deleteMany({});
  await prisma.monitorEvent.createMany({
    data: [
      { companyId: company3.id, eventDate: new Date('2026-04-18'), eventType: 'ceo_change', oldValue: 'Козлов А.В.', newValue: 'Морозова Е.С.', isRead: false },
      { companyId: company1.id, eventDate: new Date('2026-04-15'), eventType: 'address_change', oldValue: 'г. Москва, ул. Ленина, 10', newValue: 'г. Москва, ул. Тверская, 25', isRead: false },
      { companyId: company2.id, eventDate: new Date('2026-04-10'), eventType: 'okved_change', oldValue: '41.20', newValue: '41.20, 68.10', isRead: true },
      { companyId: company2.id, eventDate: new Date('2026-04-05'), eventType: 'kpp_change', oldValue: '770901001', newValue: '770401001', isRead: true },
      { companyId: company1.id, eventDate: new Date('2026-04-01'), eventType: 'contact_change', oldValue: '+7(495)111-22-33', newValue: '+7(495)444-55-66', isRead: true },
    ],
  });

  await prisma.generatedDocument.deleteMany({ where: { companyId: company1.id } });
  await prisma.generatedDocument.createMany({
    data: [
      { companyId: company1.id, name: 'Протокол собранной информации', type: 'protocol' },
      { companyId: company1.id, name: 'Перечень процессов', type: 'process_list' },
      { companyId: company1.id, name: 'Перечень систем', type: 'systems_list' },
      { companyId: company1.id, name: 'Форма согласия на обработку ПДн', type: 'consent_form' },
      { companyId: company1.id, name: 'Соглашения о безопасности ПДн (Поручения)', type: 'security_agreement' },
      { companyId: company1.id, name: 'Акт определения уровня защищённости', type: 'protection_act' },
      { companyId: company1.id, name: 'Уведомление', type: 'notification' },
      { companyId: company1.id, name: 'Политика конфиденциальности', type: 'privacy_policy' },
    ],
  });

  console.log('Seed completed. Admin: admin@samolet.ru / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

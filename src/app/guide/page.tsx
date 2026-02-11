import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  Handshake,
  MessageSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet
} from "lucide-react";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { isPageEnabled } from "@/lib/site-pages";

type GuideCopy = {
  badge: string;
  title: string;
  subtitle: string;
  employerTitle: string;
  employerSubtitle: string;
  freelancerTitle: string;
  freelancerSubtitle: string;
  matrixTitle: string;
  matrixSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaEmployer: string;
  ctaFreelancer: string;
};

const copyByLocale: Record<string, GuideCopy> = {
  ka: {
    badge: "ვიზუალური გზამკვლევი",
    title: "როგორ გამოიყენო Freela მაქსიმალური სარგებლით",
    subtitle:
      "ეს გვერდი გაჩვენებს დამკვეთისა და ფრილანსერის სრულ გზას: პროექტის დაწყებიდან შეთანხმებამდე, შესრულებამდე და შეფასებამდე.",
    employerTitle: "დამკვეთის გზა",
    employerSubtitle: "როგორ იპოვო სწორი სპეციალისტი სწრაფად და კონტროლირებადად.",
    freelancerTitle: "ფრილანსერის გზა",
    freelancerSubtitle: "როგორ მიიღო მეტი პროექტი და ააშენო ძლიერი რეპუტაცია პლატფორმაზე.",
    matrixTitle: "შესაძლებლობების მატრიცა",
    matrixSubtitle: "რა ინსტრუმენტს როდის იყენებ და ვის ეხმარება ყველაზე მეტად.",
    ctaTitle: "მზად ხარ დასაწყებად?",
    ctaSubtitle: "აირჩიე შენი როლი და იმოქმედე დღესვე.",
    ctaEmployer: "დავდებ პროექტს",
    ctaFreelancer: "ვიპოვი პროექტს"
  },
  en: {
    badge: "Visual Guide",
    title: "How to use Freela with maximum impact",
    subtitle:
      "This page maps both journeys step by step: from posting or finding a project to agreement, delivery and review.",
    employerTitle: "Employer Journey",
    employerSubtitle: "How to find the right specialist quickly and with clear control.",
    freelancerTitle: "Freelancer Journey",
    freelancerSubtitle: "How to get more projects and build stronger platform reputation.",
    matrixTitle: "Capabilities Matrix",
    matrixSubtitle: "Which tools to use, when to use them, and who benefits most.",
    ctaTitle: "Ready to start?",
    ctaSubtitle: "Pick your role and take action today.",
    ctaEmployer: "Post a project",
    ctaFreelancer: "Find a project"
  },
  ru: {
    badge: "Визуальный гайд",
    title: "Как использовать Freela с максимальной пользой",
    subtitle:
      "На этой странице показаны оба пути: от публикации или поиска проекта до договоренности, сдачи и отзыва.",
    employerTitle: "Путь заказчика",
    employerSubtitle: "Как быстро найти подходящего специалиста и держать процесс под контролем.",
    freelancerTitle: "Путь фрилансера",
    freelancerSubtitle: "Как получать больше проектов и укреплять репутацию на платформе.",
    matrixTitle: "Матрица возможностей",
    matrixSubtitle: "Какие инструменты использовать, когда и кому они полезнее всего.",
    ctaTitle: "Готовы начать?",
    ctaSubtitle: "Выберите свою роль и начните уже сегодня.",
    ctaEmployer: "Опубликовать проект",
    ctaFreelancer: "Найти проект"
  }
};

type Step = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const employerStepsByLocale: Record<string, Step[]> = {
  ka: [
    {
      title: "1) ჩამოაყალიბე ამოცანა",
      description: "აღწერე შედეგი, ვადები და ბიუჯეტი ლარში (GEL), რომ სწორი ადამიანები სწრაფად გამოეხმაურნენ.",
      icon: ClipboardList
    },
    {
      title: "2) მოძებნე და შეადარე კანდიდატები",
      description: "გადახედე პროფილებს, გამოცდილებას, შეფასებებს და შეთავაზებებს ერთ სივრცეში.",
      icon: Search
    },
    {
      title: "3) შეთანხმდი სამუშაო ფორმატზე",
      description: "შეათანხმე მოცულობა, ეტაპები და კომუნიკაცია, რომ ორივე მხარეს ზუსტი მოლოდინი ჰქონდეს.",
      icon: Handshake
    },
    {
      title: "4) ჩაიბარე და შეაფასე",
      description: "დასრულების შემდეგ დატოვე შეფასება და შექმენი სანდო ისტორია მომავალი პროექტებისთვის.",
      icon: BadgeCheck
    }
  ],
  en: [
    {
      title: "1) Define your outcome",
      description: "Clarify scope, timeline, and budget in GEL so the right specialists respond fast.",
      icon: ClipboardList
    },
    {
      title: "2) Compare candidates",
      description: "Review profiles, experience, ratings, and proposals in one place.",
      icon: Search
    },
    {
      title: "3) Align on execution",
      description: "Agree on milestones and communication rhythm for clear expectations.",
      icon: Handshake
    },
    {
      title: "4) Accept and review",
      description: "Close the project with feedback to build a reliable collaboration history.",
      icon: BadgeCheck
    }
  ],
  ru: [
    {
      title: "1) Сформулируйте задачу",
      description: "Опишите результат, сроки и бюджет в GEL, чтобы быстрее получить релевантные отклики.",
      icon: ClipboardList
    },
    {
      title: "2) Сравните кандидатов",
      description: "Просмотрите профили, опыт, рейтинг и предложения в одном месте.",
      icon: Search
    },
    {
      title: "3) Согласуйте формат работы",
      description: "Зафиксируйте этапы и коммуникацию, чтобы ожидания были понятны обеим сторонам.",
      icon: Handshake
    },
    {
      title: "4) Примите результат и оцените",
      description: "Оставьте отзыв и сформируйте надежную историю для следующих проектов.",
      icon: BadgeCheck
    }
  ]
};

const freelancerStepsByLocale: Record<string, Step[]> = {
  ka: [
    {
      title: "1) გააძლიერე პროფილი",
      description: "დაამატე სპეციალიზაცია, ძლიერი აღწერა და პორტფოლიო, რომ უფრო ხშირად მოხვდე არჩევანში.",
      icon: Sparkles
    },
    {
      title: "2) მოძებნე შესაბამისი პროექტები",
      description: "ფილტრებით იპოვე რელევანტური დავალებები და იმუშავე შენს ნიშაზე.",
      icon: BriefcaseBusiness
    },
    {
      title: "3) გაგზავნე ზუსტი შეთავაზება",
      description: "მოკლე, საქმეზე ორიენტირებული მესიჯი + რეალისტური ფასი ზრდის შერჩევის შანსს.",
      icon: MessageSquare
    },
    {
      title: "4) შეასრულე და გაზარდე რეიტინგი",
      description: "დროული მიწოდება და ხარისხი გაძლევს უკეთეს შეფასებებს და მეტ მომავალ პროექტს.",
      icon: Rocket
    }
  ],
  en: [
    {
      title: "1) Strengthen your profile",
      description: "Add specialization, focused bio, and portfolio so you appear in more shortlists.",
      icon: Sparkles
    },
    {
      title: "2) Find relevant projects",
      description: "Use filters to target the right opportunities in your niche.",
      icon: BriefcaseBusiness
    },
    {
      title: "3) Send precise proposals",
      description: "Clear messages and realistic pricing improve acceptance rate.",
      icon: MessageSquare
    },
    {
      title: "4) Deliver and grow your rating",
      description: "Reliable delivery and quality work unlock better future opportunities.",
      icon: Rocket
    }
  ],
  ru: [
    {
      title: "1) Усильте профиль",
      description: "Добавьте специализацию, четкое описание и портфолио, чтобы чаще попадать в шорт-листы.",
      icon: Sparkles
    },
    {
      title: "2) Находите релевантные проекты",
      description: "Используйте фильтры, чтобы работать с подходящими задачами в своей нише.",
      icon: BriefcaseBusiness
    },
    {
      title: "3) Отправляйте точные предложения",
      description: "Короткое по делу сообщение и реалистичная цена повышают шанс выбора.",
      icon: MessageSquare
    },
    {
      title: "4) Выполняйте и растите рейтинг",
      description: "Качество и сроки приводят к лучшим отзывам и новым заказам.",
      icon: Rocket
    }
  ]
};

type Capability = {
  title: string;
  description: string;
  audience: string;
  icon: React.ComponentType<{ className?: string }>;
};

const capabilitiesByLocale: Record<string, Capability[]> = {
  ka: [
    {
      title: "პროექტების კატალოგი",
      description: "სწრაფი ფილტრაცია კატეგორიით, ბიუჯეტით და მოთხოვნებით.",
      audience: "ორივესთვის",
      icon: Search
    },
    {
      title: "პროფილი + პორტფოლიო",
      description: "ხილვადობა და ნდობა სპეციალისტის შერჩევისთვის.",
      audience: "ფრილანსერისთვის",
      icon: Sparkles
    },
    {
      title: "შეთავაზებები და სტატუსები",
      description: "ვინ, როდის და რა პირობებით ჩაერთო პროექტში.",
      audience: "დამკვეთისთვის",
      icon: ClipboardList
    },
    {
      title: "ჩატი და რეალური დრო",
      description: "ოპერატიული კომუნიკაცია და სტატუსების განახლება.",
      audience: "ორივესთვის",
      icon: MessageSquare
    },
    {
      title: "შეფასებები და რეპუტაცია",
      description: "ღია უკუკავშირი ზრდის პლატფორმის ხარისხს.",
      audience: "ორივესთვის",
      icon: BadgeCheck
    },
    {
      title: "უსაფრთხო და გამჭვირვალე პროცესი",
      description: "კონტროლი ეტაპებზე, მკაფიო პასუხისმგებლობები და პროგრესი.",
      audience: "ორივესთვის",
      icon: ShieldCheck
    }
  ],
  en: [
    {
      title: "Project catalog",
      description: "Fast filtering by category, budget, and requirements.",
      audience: "Both",
      icon: Search
    },
    {
      title: "Profile + portfolio",
      description: "Visibility and trust for better specialist selection.",
      audience: "Freelancer",
      icon: Sparkles
    },
    {
      title: "Proposals and statuses",
      description: "Clear view of who applied and under what conditions.",
      audience: "Employer",
      icon: ClipboardList
    },
    {
      title: "Chat and realtime updates",
      description: "Faster communication and progress transparency.",
      audience: "Both",
      icon: MessageSquare
    },
    {
      title: "Ratings and reputation",
      description: "Open feedback improves quality across the platform.",
      audience: "Both",
      icon: BadgeCheck
    },
    {
      title: "Secure, transparent flow",
      description: "Control over milestones, responsibilities, and progress.",
      audience: "Both",
      icon: ShieldCheck
    }
  ],
  ru: [
    {
      title: "Каталог проектов",
      description: "Быстрые фильтры по категории, бюджету и требованиям.",
      audience: "Для всех",
      icon: Search
    },
    {
      title: "Профиль и портфолио",
      description: "Видимость и доверие для лучшего выбора специалиста.",
      audience: "Для фрилансера",
      icon: Sparkles
    },
    {
      title: "Отклики и статусы",
      description: "Понятно, кто откликнулся и на каких условиях.",
      audience: "Для заказчика",
      icon: ClipboardList
    },
    {
      title: "Чат и realtime-обновления",
      description: "Быстрая коммуникация и прозрачный прогресс.",
      audience: "Для всех",
      icon: MessageSquare
    },
    {
      title: "Оценки и репутация",
      description: "Открытая обратная связь повышает качество платформы.",
      audience: "Для всех",
      icon: BadgeCheck
    },
    {
      title: "Безопасный процесс",
      description: "Контроль этапов, ролей и выполнения задач.",
      audience: "Для всех",
      icon: ShieldCheck
    }
  ]
};

function pickLocale<T>(map: Record<string, T>, locale: string): T {
  return map[locale] ?? map.ka;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const copy = pickLocale(copyByLocale, locale);
  return { title: copy.title, description: copy.subtitle };
}

export default async function GuidePage() {
  if (!(await isPageEnabled("/guide"))) notFound();

  const locale = await getLocale();
  const copy = pickLocale(copyByLocale, locale);
  const employerSteps = pickLocale(employerStepsByLocale, locale);
  const freelancerSteps = pickLocale(freelancerStepsByLocale, locale);
  const capabilities = pickLocale(capabilitiesByLocale, locale);

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="hero-mesh absolute inset-0 -z-20" />
        <div className="hero-pattern absolute inset-0 -z-10" />
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.badge}
            </Badge>
            <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">{copy.subtitle}</p>
          </div>
        </Container>
      </section>

      <section className="border-b">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6">
              <div className="flex items-center gap-2 text-primary">
                <ClipboardList className="h-5 w-5" />
                <h2 className="text-lg font-semibold">{copy.employerTitle}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{copy.employerSubtitle}</p>
              <ol className="mt-5 space-y-3">
                {employerSteps.map((step) => (
                  <li key={step.title} className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{step.description}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="border-success/20 bg-gradient-to-br from-success/10 via-background to-background p-6">
              <div className="flex items-center gap-2 text-success">
                <BriefcaseBusiness className="h-5 w-5" />
                <h2 className="text-lg font-semibold">{copy.freelancerTitle}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{copy.freelancerSubtitle}</p>
              <ol className="mt-5 space-y-3">
                {freelancerSteps.map((step) => (
                  <li key={step.title} className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-success/10 p-2 text-success">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{step.description}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/20">
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.matrixTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{copy.matrixSubtitle}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <Card key={item.title} className="group relative overflow-hidden border-border/70 bg-card/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 font-semibold">{item.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  <Badge variant="secondary" className="mt-3">
                    {item.audience}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-12 sm:py-16">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold sm:text-2xl">{copy.ctaTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{copy.ctaSubtitle}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/projects/new" className="group">
                  {copy.ctaEmployer}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </ButtonLink>
                <ButtonLink href="/projects" variant="secondary" className="group">
                  {copy.ctaFreelancer}
                  <Wallet className="ml-2 h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

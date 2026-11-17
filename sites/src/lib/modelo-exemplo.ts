import type { PublicBuilder, PublicBuildingListItem } from '@/lib/api'
import type { Fact, LandingGallery, LandingHighlight } from '@/lib/modelo'

export const EXEMPLO_SLUG = 'residencial-orla-vita'

const FALLBACK_BUILDER: PublicBuilder = {
  name: 'Construtora Alpha',
  email: 'construtora@alpha.demo',
  phone: '1130001001',
}

const DESCRIPTION = [
  'Residencial Orla Vita é um lançamento de uso misto à beira da lagoa, com torre residencial, lazer no térreo e rooftop. A proposta junta morar e receber a poucos minutos do acesso principal.',
  'O pavimento tipo reúne 6 unidades. As plantas vão de 67 m², com 2 dormitórios, a 142 m² no garden. São 18 pavimentos residenciais e dois subsolos de garagem, com 2 vagas por unidade.',
  'A área comum foi pensada para o dia inteiro: academia, piscina aquecida, quadra de padel, espaços kids e pet, care laundry e um rooftop com vista permanente.',
].join('\n\n')

export const exemploHighlights: LandingHighlight[] = [
  { title: 'Acesso facilitado', icon: 'access' },
  { title: 'Arquitetura Wellness', icon: 'wellness' },
  { title: 'Complexo multiuso', icon: 'mixed' },
  { title: 'Localização estratégica', icon: 'pin' },
  { title: 'Potencial de valorização', icon: 'chart' },
]

export const exemploAreas = [
  'Arquitetura wellness',
  'Academia',
  'Care Laundry',
  'Espaço Pet',
  'Espaço Gourmet',
  'Espaço Kids',
  'Espaços de convivência',
  'Espaço Grill',
  'Sala de Jogos',
  'Garden',
  'Conveniência',
  'Piscina aquecida',
  'Warm Terrace',
  'Lounge Terrace',
  'Quadra de Padel',
  'Padel Lounge',
  'Rooftop',
]

export const exemploFacts: Fact[] = [
  { label: 'Metragem', value: '67–142 m²' },
  { label: 'Unidades por andar', value: '6' },
  { label: 'Pavimentos', value: '18' },
  { label: 'Vagas', value: '2 por unidade' },
]

export const exemploExtras: Fact[] = [
  { label: 'Dormitórios', value: '2 e 3, além do garden' },
  { label: 'Pé-direito', value: '2,70 m' },
  { label: 'Esquadrias', value: 'Alumínio, piso ao teto' },
  { label: 'Piso', value: 'Porcelanato' },
  { label: 'Forro', value: 'Gesso' },
  { label: 'Orientação', value: 'Norte, sol da manhã' },
  { label: 'Garagem', value: '2 subsolos' },
  { label: 'Entrega prevista', value: '2º semestre de 2028' },
]

export const exemploFolder = '/modelo/exemplo/folder.pdf'
export const exemploPrice = 1_280_000

export const exemploGalleries: LandingGallery[] = [
  {
    id: 'externas',
    title: 'Imagens externas',
    kind: 'photo',
    shots: [
      { url: '/modelo/exemplo/fachada.jpg', caption: 'Fachada' },
      { url: '/modelo/exemplo/acesso.jpg', caption: 'Acesso' },
      { url: '/modelo/exemplo/piscina.jpg', caption: 'Piscina' },
      { url: '/modelo/exemplo/rooftop.jpg', caption: 'Rooftop' },
      { url: '/modelo/exemplo/padel.jpg', caption: 'Quadra de padel' },
    ],
  },
  {
    id: 'internas',
    title: 'Imagens internas',
    kind: 'photo',
    shots: [
      { url: '/modelo/exemplo/estar.jpg', caption: 'Estar' },
      { url: '/modelo/exemplo/cozinha.jpg', caption: 'Cozinha' },
      { url: '/modelo/exemplo/suite.jpg', caption: 'Suíte' },
      { url: '/modelo/exemplo/gourmet.jpg', caption: 'Espaço gourmet' },
    ],
  },
  {
    id: 'plantas',
    title: 'Plantas das unidades',
    kind: 'plan',
    shots: [
      { url: '/modelo/exemplo/planta-2-dormitorios.svg', caption: '2 dormitórios · 67 m²' },
      { url: '/modelo/exemplo/planta-3-dormitorios.svg', caption: '3 dormitórios · 98 m²' },
      { url: '/modelo/exemplo/planta-garden.svg', caption: 'Garden · 142 m²' },
    ],
  },
  {
    id: 'plantas-gerais',
    title: 'Plantas gerais',
    kind: 'plan',
    shots: [
      { url: '/modelo/exemplo/planta-geral-terreo.svg', caption: 'Térreo' },
      { url: '/modelo/exemplo/planta-geral-tipo.svg', caption: 'Pavimento tipo · 6 unidades' },
      { url: '/modelo/exemplo/planta-geral-cobertura.svg', caption: 'Cobertura' },
    ],
  },
]

export function exemploParagraphs(): string[] {
  return DESCRIPTION.split(/\n{2,}/)
}

export function exemploAddress(): string {
  return 'Rua das Acácias, 480 — Jurerê, Florianópolis/SC'
}

export function exemploListItem(builder: PublicBuilder | null): PublicBuildingListItem {
  return {
    id: 0,
    slug: EXEMPLO_SLUG,
    name: 'Residencial Orla Vita',
    description: 'Torre de uso misto à beira da lagoa, com lazer no térreo e rooftop.',
    city: 'Florianópolis',
    state: 'SC',
    seo_title: 'Residencial Orla Vita — Florianópolis',
    seo_description: 'Lançamento com plantas de 67 a 142 m², 6 unidades por andar e 18 pavimentos.',
    units_count: 0,
    cheapest_unit: {
      code: '',
      price: String(exemploPrice),
      area_m2: '67',
      floor: null,
    },
    cover_image: { id: 0, url: '/modelo/exemplo/fachada.jpg' },
    builder: builder ?? FALLBACK_BUILDER,
  }
}

export function withExemploListing(buildings: PublicBuildingListItem[]): PublicBuildingListItem[] {
  const known = buildings.find((building) => building.slug === EXEMPLO_SLUG)
  const builder = known?.builder ?? buildings.find((building) => building.builder?.name)?.builder ?? null
  const item = exemploListItem(builder)

  if (!known) {
    return [item, ...buildings]
  }

  return buildings.map((building) =>
    building.slug === EXEMPLO_SLUG
      ? {
          ...building,
          name: item.name,
          description: building.description?.trim() || item.description,
          city: item.city,
          state: item.state,
          units_count: 0,
          cheapest_unit: item.cheapest_unit,
          cover_image: item.cover_image,
          builder: building.builder ?? item.builder,
        }
      : building,
  )
}

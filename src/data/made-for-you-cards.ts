export interface MadeForYouCard {
  mixNum: number;
  category: string;
  title: string;
  sub: string;
  price: string;
  imageUrl: string;
  gradient: string;
  actionLabel: string;
}

export const madeForYouCards: MadeForYouCard[] = [
  {
    mixNum: 1,
    category: 'Frontend',
    title: 'React SPA',
    sub: 'Dashboard app with real-time data',
    price: 'Free',
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #1DB954, #191414)',
    actionLabel: 'View Project',
  },
  {
    mixNum: 2,
    category: 'Full Stack',
    title: 'API Gateway',
    sub: 'Microservices orchestration layer',
    price: 'Free',
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #3B82F6, #1E3A5F)',
    actionLabel: 'View Project',
  },
  {
    mixNum: 3,
    category: 'DevOps',
    title: 'CI/CD Pipeline',
    sub: 'Automated deployment with Docker',
    price: 'Free',
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #8B5CF6, #2D1B69)',
    actionLabel: 'View Project',
  },
  {
    mixNum: 4,
    category: 'Mobile',
    title: 'Cross-Platform App',
    sub: 'React Native experience',
    price: 'Free',
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #F97316, #7C2D12)',
    actionLabel: 'View Project',
  },
  {
    mixNum: 5,
    category: 'Backend',
    title: 'RESTful API',
    sub: 'Node.js with Express & Postgres',
    price: 'Free',
    imageUrl: '',
    gradient: 'linear-gradient(135deg, #10B981, #064E3B)',
    actionLabel: 'View Project',
  },
];

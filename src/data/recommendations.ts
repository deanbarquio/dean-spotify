export type Recommendation = {
  id: string;
  name: string;
  title: string;
  date: string;
  context: string;
  quote: string[];
  accent: string;
  initials: string;
  poster: string;
  tags: string[];
};

export const recommendations: Recommendation[] = [
  {
    id: 'hazel',
    name: 'Hazel Sellote',
    title: 'Senior UI/UX Designer · Creative Designer · HTE Trainer @ N-Compass TV',
    date: 'May 2026',
    context: 'Worked with Dean on the same team',
    initials: 'HS',
    accent: '#EC4899',
    poster: 'hazel',
    tags: ['UI/UX', 'Leadership', 'Mentorship'],
    quote: [
      'Dean has consistently shown exceptional professionalism and dedication since his internship days at N-Compass. Throughout the years I worked with him, I witnessed his strong eagerness to learn, improve, and grow in his career.',
      'What stands out most about Dean is his work ethic and professionalism. He is reliable, disciplined, and able to maintain a positive attitude even under pressure. His willingness to take initiative, adapt to challenges, and continuously improve his skills makes him someone you can truly depend on in a team environment.',
      'Dean is not only a hardworking professional but also someone who inspires others through his passion for learning and dedication to excellence. I highly recommend him to any organization or team looking for a committed and capable professional.',
    ],
  },
  {
    id: 'shawn',
    name: 'Shawn Resentes',
    title: 'Senior Software Quality Assurance',
    date: 'Feb 2026',
    context: 'Senior to Dean; reported indirectly',
    initials: 'SR',
    accent: '#3B82F6',
    poster: 'shawn',
    tags: ['QA', 'Root Cause', 'Frontend'],
    quote: [
      "I've had the pleasure of working with Dean since his internship at N-Compass TV, and it's been great to see his growth into a strong and reliable Frontend Developer.",
      'Dean has a keen eye for detail and a highly analytical mindset. He consistently asks the right questions to ensure his implementations fully align with business requirements. What truly stands out is his ability to perform solid root cause analysis and recommend comprehensive, long-term fixes rather than quick patches.',
      'I highly recommend Dean to any team looking for a proactive, detail-oriented, and collaborative Frontend Developer who takes ownership of his work and values quality delivery.',
    ],
  },
  {
    id: 'samantha',
    name: 'Samantha Rubica',
    title: 'Information Technology Student · Web Developer',
    date: 'Feb 2026',
    context: 'Dean was senior; did not manage directly',
    initials: 'Sa',
    accent: '#8B5CF6',
    poster: 'samantha',
    tags: ['Leadership', 'Critical Thinking', 'Team'],
    quote: [
      "I've worked with Dean on various cases and events, and throughout those experiences, he has consistently demonstrated strong critical and logical thinking skills. He approaches every challenge with a clear, analytical mindset.",
      'Dean also shows natural leadership—he steps up when guidance is needed, keeps the team focused, and leads by example with professionalism and accountability. His combination of technical competence, leadership ability, and strong interpersonal skills makes him a valuable asset in any team or organization.',
    ],
  },
  {
    id: 'joshua',
    name: 'Joshua Jakosalem',
    title: 'IT Student · Aspiring Software Dev & UI/UX Designer',
    date: 'Feb 2026',
    context: 'Reported to Dean during internship',
    initials: 'JJ',
    accent: '#06B6D4',
    poster: 'joshua',
    tags: ['Angular', 'Architecture', 'Mentor'],
    quote: [
      "I worked under Dean during my internship, and his ability to balance hands-on guidance with his own high-volume deliverables is rare. He's incredibly disciplined and organized.",
      "Technically, Dean doesn't just look at problems at face value. He goes deep into the actual issue to find lasting solutions that make sense for the long term. His grasp of Angular and other frameworks is sharp, and he uses his own time to upskill and integrate new methods that improve our workflow.",
      "I'd recommend him for any projects that involve frontend architecture or backend processes. He's the type of engineer who builds for stability and scalability.",
    ],
  },
  {
    id: 'jeanne',
    name: 'Jeanne Dominique Paloma',
    title: 'Software Engineer & Full-Stack Developer',
    date: 'Feb 2026',
    context: 'Worked with Dean on the same team',
    initials: 'JP',
    accent: '#F97316',
    poster: 'jeanne',
    tags: ['Full-Stack', 'React', 'NestJS'],
    quote: [
      'Dean is a highly capable and reliable Full Stack Software Engineer with strong expertise in both backend and frontend development, with a particular focus on frontend.',
      'He is skilled in React, Angular, Next.js, NestJS, Python, Java, and Tailwind CSS, and excels at translating complex requirements into clean, scalable, and user-friendly interfaces. Collaborative, proactive, and willing to take initiative—highly recommended for frontend, full-stack, or modern web application development.',
    ],
  },
];

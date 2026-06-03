import { ArticleCard } from '@/components/ui/article-cards';
import { madeForYouCards } from '@/data/made-for-you-cards';

function scrollToProjects() {
  void import('@/lib/scroll-to-section').then(({ scrollToSection }) => {
    scrollToSection('#projects', 'smooth');
  });
}

export default function MadeForYouGrid() {
  return (
    <div className="mfy-article-grid">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {madeForYouCards.map((article) => (
          <ArticleCard
            key={article.mixNum}
            category={article.category}
            title={article.title}
            subtitle={article.sub}
            price={article.price}
            imageUrl={article.imageUrl}
            gradient={article.gradient}
            actionLabel={article.actionLabel}
            onClick={scrollToProjects}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToProjects();
              }
            }}
            role="button"
            tabIndex={0}
            className="h-72 xl:h-80"
          />
        ))}
      </div>
    </div>
  );
}

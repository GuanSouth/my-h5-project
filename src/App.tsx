import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { faker } from '@faker-js/faker';
import PullToRefresh from 'react-pull-to-refresh';

// Types
interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  author: {
    name: string;
    avatar: string;
  };
  type: 'image' | 'video' | 'game';
  category: string;
}

interface ContentTemplate {
  titles: string[];
  contents: string[];
  images?: string[];
}

interface CategoryContent {
  [key: string]: ContentTemplate;
}

interface ContentTemplates {
  image: CategoryContent;
  video: CategoryContent;
  game: CategoryContent;
}

// Styled Components
const Container = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: 8px;
  background-color: #f7f7f7;
`;

const WaterfallContainer = styled.div`
  column-count: 2;
  column-gap: 8px;
  padding: 0;
  
  @media (max-width: 480px) {
    column-count: 2;
    column-gap: 8px;
  }
`;

const Card = styled.div`
  break-inside: avoid;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  margin-bottom: 8px;
  display: inline-block;
  width: 100%;
`;

const CardMedia = styled.div<{ aspectRatio?: string }>`
  width: 100%;
  position: relative;
  aspect-ratio: ${props => props.aspectRatio || '16/9'};
  background: #f0f0f0;
  
  img, video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`;

const CardContent = styled.div`
  padding: 10px 12px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
`;

const AuthorName = styled.span`
  font-size: 13px;
  color: #333;
  font-weight: 500;
`;

const Title = styled.h3`
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #f5f5f5;
  color: #999;
  font-size: 13px;
  
  span {
    display: flex;
    align-items: center;
    margin-right: 16px;
  }
`;

const Category = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
`;

const PullToRefreshContainer = styled.div`
  .ptr__pull-down {
    background: #f7f7f7;
    height: 50px;
    line-height: 50px;
    text-align: center;
    color: #666;
    font-size: 14px;
  }

  .ptr__release {
    background: #f7f7f7;
  }

  .ptr__loading {
    background: #f7f7f7;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    
    &::after {
      content: '';
      width: 20px;
      height: 20px;
      border: 2px solid #666;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Mock data generator
const generateMockPost = (type: string = 'random', category?: string): Post => {
  const types = ['image', 'video', 'game'] as const;
  
  // 内容类型与分类的映射关系
  const typeCategories = {
    image: ['优质用户推荐', '同人创作', '装扮展示'],
    video: ['版本前瞻', '游戏实况', '精彩集锦'],
    game: ['每日攻略', '副本攻略', '装备搭配']
  };

  // 根据type选择合适的分类
  const selectedType = type === 'random' 
    ? types[Math.floor(Math.random() * types.length)]
    : (type as typeof types[number]);
  
  const availableCategories = typeCategories[selectedType];
  const selectedCategory = category && availableCategories.includes(category)
    ? category
    : availableCategories[Math.floor(Math.random() * availableCategories.length)];

  // 不同类型的内容模板
  const contentTemplates: ContentTemplates = {
    image: {
      '优质用户推荐': {
        titles: [
          '『童话小屋』超美的家园装饰分享✨',
          '『温馨小窝』我的梦幻庭院设计🏡',
          '『创意工坊』这些家具搭配绝了！🎨'
        ],
        contents: [
          '分享一下我的小屋装扮，花了好久才布置好，喜欢的话记得点赞哦~',
          '庭院里种满了花花草草，还有可爱的小动物，快来参观吧！',
          '独特的家具搭配技巧，让你的小屋焕然一新！'
        ],
        images: [
          'https://picsum.photos/seed/house1/400/500',
          'https://picsum.photos/seed/house2/400/300',
          'https://picsum.photos/seed/house3/400/400'
        ]
      },
      '同人创作': {
        titles: [
          '『同人绘画』最新角色立绘分享🎨',
          '『玩家创作』游戏场景重现✏️',
          '『插画分享』新角色设计构思💫'
        ],
        contents: [
          '花了一周时间画的新角色，希望大家喜欢！',
          '用手绘还原了游戏中最喜欢的场景，分享给大家~',
          '新角色的设计灵感来自于...'
        ],
        images: [
          'https://picsum.photos/seed/art1/400/400',
          'https://picsum.photos/seed/art2/400/500',
          'https://picsum.photos/seed/art3/400/300'
        ]
      }
    },
    video: {
      '版本前瞻': {
        titles: [
          '【版本前瞻】全新玩法抢先看！🎮',
          '【更新预告】新地图即将上线！🗺️',
          '【爆料时间】新角色技能展示！⚔️'
        ],
        contents: [
          '2.0版本带来革命性更新，一起来看看有哪些惊喜吧！',
          '广大玩家期待已久的雪山地图终于要来了！',
          '新角色技能特效华丽，操作感超棒！'
        ]
      },
      '游戏实况': {
        titles: [
          '【实况】史诗级团战回放！💥',
          '【高能时刻】极限1v3翻盘！🏆',
          '【欢乐时刻】搞笑集锦第8期😆'
        ],
        contents: [
          '这波团战打得太精彩了，关键时刻的操作太帅了！',
          '被包围的绝境翻盘，看我是如何绝处逢生的！',
          '游戏中的各种搞笑时刻，保证让你笑出声！'
        ]
      }
    },
    game: {
      '每日攻略': {
        titles: [
          '【每日攻略】新手必看技巧分享📖',
          '【战斗指南】Boss战技巧详解🗡️',
          '【进阶教程】高分技巧分享🏅'
        ],
        contents: [
          '萌新福利！详细的新手教程，让你快速上手！',
          '困难Boss终于不再难打，这些技巧一学就会！',
          '想要提升游戏水平？这些进阶技巧不容错过！'
        ]
      },
      '装备搭配': {
        titles: [
          '【最强搭配】T0配装推荐⚔️',
          '【平民攻略】平民玩家配装指南🛡️',
          '【专属搭配】各职业最佳装备选择💎'
        ],
        contents: [
          '最新版本最强装备搭配推荐，助你轻松上分！',
          '不氪也能玩出高输出，平民玩家必看！',
          '各职业的最佳装备搭配详解，让你的角色更强力！'
        ]
      }
    }
  };

  const typeContent = contentTemplates[selectedType];
  const categoryContent = typeContent[selectedCategory];
  const randomIndex = Math.floor(Math.random() * categoryContent.titles.length);

  const mockAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc'
  ];

  const mockUsernames = ['小鱼儿🐟', '青空千绪✨', '大橘无情🐱', '迷你世界玩家🎮'];

  return {
    id: faker.string.uuid(),
    title: categoryContent.titles[randomIndex],
    content: categoryContent.contents[randomIndex],
    imageUrl: selectedType === 'image' 
      ? (categoryContent.images ? categoryContent.images[randomIndex] : `https://picsum.photos/seed/${faker.string.numeric(5)}/400/300`)
      : undefined,
    videoUrl: selectedType === 'video' 
      ? 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
      : undefined,
    likes: faker.number.int({ min: 5, max: 100 }),
    author: {
      name: mockUsernames[Math.floor(Math.random() * mockUsernames.length)],
      avatar: mockAvatars[Math.floor(Math.random() * mockAvatars.length)]
    },
    type: selectedType,
    category: selectedCategory
  };
};

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentType, setContentType] = useState<string>('random');
  const [category, setCategory] = useState<string | undefined>();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'random';
    const cat = urlParams.get('category');
    setContentType(type);
    setCategory(cat || undefined);
    loadMorePosts(type, cat || undefined);
  }, []);

  const loadMorePosts = async (type: string = contentType, cat?: string) => {
    if (loading) return;
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newPosts = Array(10).fill(null).map(() => generateMockPost(type, cat));
    
    setPosts(prev => [...prev, ...newPosts]);
    setPage(prev => prev + 1);
    setLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, contentType, category]);

  const handleRefresh = async () => {
    setLoading(true);
    setPosts([]);
    setPage(1);
    await loadMorePosts(contentType, category);
    setLoading(false);
    return Promise.resolve();
  };

  return (
    <PullToRefreshContainer>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullDownThreshold={70}
        resistance={2.5}
        pullDownContent={<div className="ptr__pull-down">👇 下拉刷新</div>}
        releaseContent={<div className="ptr__release">✌️ 松手刷新</div>}
        refreshContent={<div className="ptr__loading"></div>}
      >
        <Container ref={containerRef}>
          <WaterfallContainer>
            {posts.map((post) => (
              <Card key={post.id}>
                <CardMedia aspectRatio={post.type === 'video' ? '16/9' : '4/3'}>
                  {post.category && <Category>{post.category}</Category>}
                  {post.type === 'video' && post.videoUrl ? (
                    <video controls>
                      <source src={post.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img src={post.imageUrl} alt={post.title} loading="lazy" />
                  )}
                </CardMedia>
                <CardContent>
                  <CardHeader>
                    <Avatar src={post.author.avatar} alt={post.author.name} />
                    <AuthorName>{post.author.name}</AuthorName>
                  </CardHeader>
                  <Title>{post.title}</Title>
                  <Description>{post.content}</Description>
                </CardContent>
                <Stats>
                  <span>👍 {post.likes}</span>
                </Stats>
              </Card>
            ))}
          </WaterfallContainer>
          {loading && <LoadingSpinner>加载中...</LoadingSpinner>}
        </Container>
      </PullToRefresh>
    </PullToRefreshContainer>
  );
};

export default App; 
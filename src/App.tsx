import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { faker } from '@faker-js/faker';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

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
`;

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #f5f5f5;
  color: #999;
  font-size: 13px;
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

const RefreshIndicator = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7f7f7;
  transform: translateY(${props => props.visible ? '0' : '-100%'});
  transition: transform 0.3s ease;
  z-index: 1000;
`;

const AnimatedContainer = styled(animated.div)`
  min-height: 100vh;
  background-color: #f7f7f7;
`;

// Mock data generator
const generateMockPost = (type: string = 'random', category?: string): Post => {
  const types = ['image', 'video', 'game'] as const;
  const typeCategories = {
    image: ['优质用户推荐', '同人创作', '装扮展示'],
    video: ['版本前瞻', '游戏实况', '精彩集锦'],
    game: ['每日攻略', '副本攻略', '装备搭配']
  };

  const selectedType = type === 'random' 
    ? types[Math.floor(Math.random() * types.length)]
    : (type as typeof types[number]);

  const availableCategories = typeCategories[selectedType as keyof typeof typeCategories];
  const selectedCategory = category && availableCategories.includes(category)
    ? category
    : availableCategories[Math.floor(Math.random() * availableCategories.length)];

  const mockAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna'
  ];

  const mockUsernames = ['小鱼儿🐟', '青空千绪✨', '大橘无情🐱', '迷你世界玩家🎮'];
  const randomSeed = Math.floor(Math.random() * 1000);

  return {
    id: faker.string.uuid(),
    title: `${selectedCategory} - ${faker.lorem.words(3)}`,
    content: faker.lorem.sentence(10),
    imageUrl: selectedType === 'image' 
      ? `https://picsum.photos/seed/${randomSeed}/400/500`
      : undefined,
    videoUrl: selectedType === 'video' 
      ? 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
      : undefined,
    likes: Math.floor(Math.random() * 95) + 5,
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
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const contentType = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('type') ?? 'image';
  })();
  
  const category = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') ?? '';
  })();

  // Load posts
  const loadPosts = useCallback(async (refresh: boolean = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const newPosts = Array(6).fill(null).map(() => generateMockPost(contentType, category));
      setPosts(prev => refresh ? newPosts : [...prev, ...newPosts]);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  }, [contentType, category, loading]);

  // Initial load
  useEffect(() => {
    loadPosts(true);
  }, [contentType, category]);

  // Handle pull-to-refresh
  const bind = useDrag(
    ({ down, movement: [, my], cancel, direction: [, dy] }) => {
      // 只在向下拖动时触发
      if (dy < 0) return;
      
      // 如果滚动位置不在顶部，不触发下拉刷新
      if (window.scrollY > 0) return;

      if (my > 100 && !refreshing) {
        setRefreshing(true);
        cancel();
        
        // 执行刷新
        loadPosts(true).then(() => {
          setRefreshing(false);
          api.start({ y: 0 });
        });
      }

      // 更新拖动位置
      api.start({
        y: down ? my : 0,
        immediate: down,
      });
    },
    {
      bounds: { top: 0, bottom: 150 },
      rubberband: true,
    }
  );

  // Handle infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loading || refreshing) return;
      
      const scrolledToBottom =
        window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 200;

      if (scrolledToBottom) {
        loadPosts(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadPosts, refreshing]);

  return (
    <>
      <RefreshIndicator visible={refreshing}>
        {refreshing ? '刷新中...' : '下拉刷新'}
      </RefreshIndicator>
      <AnimatedContainer
        ref={containerRef}
        {...bind()}
        style={{
          y,
          touchAction: 'pan-y',
        }}
      >
        <Container>
          <WaterfallContainer>
            {posts.map((post) => (
              <Card key={post.id}>
                <CardMedia aspectRatio={post.type === 'image' ? '4/5' : '16/9'}>
                  {post.type === 'image' && post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} loading="lazy" />
                  )}
                  {post.type === 'video' && post.videoUrl && (
                    <video src={post.videoUrl} poster={post.imageUrl} controls />
                  )}
                  <Category>{post.category}</Category>
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
                  <span>❤️ {post.likes}</span>
                </Stats>
              </Card>
            ))}
          </WaterfallContainer>
          {loading && <LoadingSpinner>加载中...</LoadingSpinner>}
        </Container>
      </AnimatedContainer>
    </>
  );
};

export default App; 
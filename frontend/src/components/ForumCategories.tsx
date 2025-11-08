import React from 'react';
import { MessageSquare, Users, BookOpen, Lightbulb, Plus, ArrowRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ForumCategoriesProps {
  onNavigate: (page: string) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

const forumCategories = [
  {
    id: 1,
    name: 'General Discussion',
    description: 'General community chat, introductions, and announcements',
    icon: MessageSquare,
    topics: 127,
    posts: 1453,
    color: 'blue',
    lastActivity: 'Active 5 minutes ago',
  },
  {
    id: 2,
    name: 'Project Collaboration',
    description: 'Find partners for larger projects and collaborative initiatives',
    icon: Users,
    topics: 43,
    posts: 567,
    color: 'green',
    lastActivity: 'Active 1 hour ago',
  },
  {
    id: 3,
    name: 'Storytelling Circle',
    description: 'Share experiences, success stories, and lessons learned',
    icon: BookOpen,
    topics: 89,
    posts: 892,
    color: 'purple',
    lastActivity: 'Active 2 hours ago',
  },
  {
    id: 4,
    name: 'Skills & Learning',
    description: 'Ask questions, share knowledge, and discuss learning opportunities',
    icon: Lightbulb,
    topics: 156,
    posts: 2134,
    color: 'amber',
    lastActivity: 'Active 30 minutes ago',
  },
  {
    id: 5,
    name: 'Community Events',
    description: 'Organize meetups, workshops, and community gatherings',
    icon: Users,
    topics: 34,
    posts: 412,
    color: 'orange',
    lastActivity: 'Active 3 hours ago',
  },
  {
    id: 6,
    name: 'Feedback & Suggestions',
    description: 'Help improve The Hive with your ideas and feedback',
    icon: MessageSquare,
    topics: 67,
    posts: 523,
    color: 'pink',
    lastActivity: 'Active 1 day ago',
  },
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
};

export function ForumCategories({ onNavigate, userBalance = 1, unreadNotifications = 0, onLogout = () => {}, isAuthenticated = false }: ForumCategoriesProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="forum" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={isAuthenticated}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 border-b border-orange-600">
        <div className="max-w-[1440px] mx-auto px-8 py-16">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-white mb-4">Community Forums</h1>
              <p className="text-amber-50 text-lg mb-6">
                Connect with community members, share ideas, collaborate on projects, 
                and build lasting relationships beyond service exchanges.
              </p>
              <Button 
                size="lg"
                className="bg-white text-orange-600 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Topic
              </Button>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758873268631-fa944fc5cad2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwdGVhbSUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzYyMDUyMDkxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Community collaboration"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 py-12">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">516</div>
            <div className="text-sm text-gray-600">Total Topics</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">5,981</div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">1,247</div>
            <div className="text-sm text-gray-600">Active Members</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="text-3xl text-gray-900 mb-1">234</div>
            <div className="text-sm text-gray-600">Online Now</div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">Forum Categories</h2>
          <p className="text-gray-600 mb-8">
            Choose a category to browse discussions or start a new conversation
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {forumCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  // Navigate to category topics
                }}
                className="bg-white rounded-xl border border-gray-200 p-8 hover:border-amber-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    colorClasses[category.color as keyof typeof colorClasses]
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-gray-900 group-hover:text-orange-600 transition-colors">
                        {category.name}
                      </h3>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>{category.topics} topics</span>
                        <span>{category.posts} posts</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {category.lastActivity}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Community Guidelines CTA */}
        <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white mb-2">New to the forums?</h3>
              <p className="text-gray-300">
                Please read our community guidelines before posting to ensure a 
                respectful and welcoming environment for everyone.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-700 flex-shrink-0 ml-6"
              onClick={() => {
                const guidelines = `Community Guidelines

1. Be Respectful
   - Treat all members with kindness and respect
   - No harassment, discrimination, or hate speech
   - Disagree constructively and professionally

2. Stay On Topic
   - Keep discussions relevant to the forum category
   - Use appropriate categories for your posts
   - Avoid spamming or off-topic content

3. Share Knowledge
   - Help others by sharing your expertise
   - Ask questions when you need help
   - Provide constructive feedback

4. Follow TimeBank Principles
   - Honor your commitments
   - Communicate clearly about schedules
   - Report issues through proper channels

5. Privacy & Safety
   - Don't share personal information publicly
   - Report suspicious behavior
   - Respect others' privacy

6. Moderation
   - Admins may remove inappropriate content
   - Repeated violations may result in warnings or bans
   - Appeals can be made through support channels

Thank you for helping maintain a positive community!`;
                // Show guidelines in a more user-friendly way
                const guidelinesModal = document.createElement('div');
                guidelinesModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
                
                const modalContent = document.createElement('div');
                modalContent.className = 'bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto shadow-xl';
                
                const title = document.createElement('h2');
                title.className = 'text-2xl font-bold mb-4';
                title.textContent = 'Community Guidelines';
                
                const pre = document.createElement('pre');
                pre.className = 'whitespace-pre-wrap text-sm text-gray-700';
                pre.textContent = guidelines;
                
                const closeButton = document.createElement('button');
                closeButton.className = 'mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600';
                closeButton.textContent = 'Close';
                closeButton.addEventListener('click', () => guidelinesModal.remove());
                
                modalContent.appendChild(title);
                modalContent.appendChild(pre);
                modalContent.appendChild(closeButton);
                guidelinesModal.appendChild(modalContent);
                document.body.appendChild(guidelinesModal);
              }}
            >
              Read Guidelines
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Badge } from './badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component for displaying content in a contained box.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content. You can put any content here.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Manage your account preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Update your profile information and notification preferences.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  ),
};

export const ProjectCard: Story = {
  render: () => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Web Development Project</CardTitle>
            <CardDescription>Full-stack e-commerce platform</CardDescription>
          </div>
          <Badge>IT / Development</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          Looking for an experienced developer to build a modern e-commerce
          platform with Next.js, PostgreSQL, and Stripe integration.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="font-semibold">₾2,500</span>
          <span className="text-muted-foreground">Posted 2 days ago</span>
        </div>
      </CardContent>
    </Card>
  ),
};

export const FreelancerCard: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            JD
          </div>
          <div>
            <CardTitle className="text-lg">John Doe</CardTitle>
            <CardDescription>Full-Stack Developer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary">React</Badge>
          <Badge variant="secondary">Node.js</Badge>
          <Badge variant="secondary">PostgreSQL</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          5+ years of experience building scalable web applications.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">₾50/hr</span>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-500">★</span>
            <span>4.9 (23 reviews)</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View Profile</Button>
      </CardFooter>
    </Card>
  ),
};

export const StatsCard: Story = {
  render: () => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">143</p>
          <p className="text-sm text-muted-foreground mt-1">Active Projects</p>
        </div>
      </CardContent>
    </Card>
  ),
};

export const NotificationCard: Story = {
  render: () => (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-primary mt-2" />
          <div>
            <p className="font-medium">New proposal received</p>
            <p className="text-sm text-muted-foreground">
              Someone applied to your &quot;Web Development&quot; project
            </p>
            <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Spinner } from './spinner';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading spinner indicator.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <Spinner size="sm" />
        <p className="text-xs text-muted-foreground mt-2">Small</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-xs text-muted-foreground mt-2">Medium</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-xs text-muted-foreground mt-2">Large</p>
      </div>
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
      <Spinner size="sm" />
      Loading...
    </button>
  ),
};

export const FullPage: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center h-64 w-64 bg-background border border-border rounded-lg">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground mt-4">Loading content...</p>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text input component with support for icons, validation states, and various input types.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    placeholder: 'john@example.com',
  },
  render: (args) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Email</label>
      <Input {...args} type="email" />
    </div>
  ),
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
    min: 0,
    max: 100,
  },
};

export const SearchInput: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter email',
    defaultValue: 'invalid-email',
  },
  render: (args) => (
    <div className="space-y-2">
      <Input {...args} className="border-destructive" />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
};

export const WithValue: Story = {
  args: {
    defaultValue: 'john@example.com',
  },
};

// Interactive password toggle
const PasswordInputWithToggle = () => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        placeholder="Password"
        defaultValue="mySecretPassword123"
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export const PasswordWithToggle: Story = {
  render: () => <PasswordInputWithToggle />,
};

// Full form example
export const FormExample: Story = {
  render: () => (
    <form className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Full Name</label>
        <Input placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input type="password" placeholder="••••••••" />
      </div>
    </form>
  ),
};

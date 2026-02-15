import type { Meta, StoryObj } from '@storybook/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './modal';
import { Button } from './button';
import { Input } from './input';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Dialog/modal component for displaying content in an overlay.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive modal wrapper
const ModalDemo = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open {title}</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalBody>
            {children}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ModalDemo title="Default Modal">
      <p className="text-muted-foreground">
        This is a default modal with some content. You can close it by clicking
        the X button or pressing Escape.
      </p>
    </ModalDemo>
  ),
};

export const SmallModal: Story = {
  render: () => (
    <ModalDemo title="Delete Confirmation">
      <p className="text-muted-foreground mb-4">
        Are you sure you want to delete this item? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </ModalDemo>
  ),
};

export const LargeModal: Story = {
  render: () => (
    <ModalDemo title="Project Details">
      <div className="space-y-4">
        <p className="text-muted-foreground">
          This is a large modal that can contain more content. Use it for complex
          forms, detailed information, or multi-step wizards.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Title</label>
            <Input defaultValue="E-commerce Platform" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Budget (GEL)</label>
            <Input type="number" defaultValue="5000" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            defaultValue="Full-stack e-commerce platform with payment integration..."
          />
        </div>
      </div>
    </ModalDemo>
  ),
};

export const FormModal: Story = {
  render: () => (
    <ModalDemo title="Contact Freelancer">
      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input placeholder="Project inquiry" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Hi, I'm interested in working with you on..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button">Cancel</Button>
          <Button type="submit">Send Message</Button>
        </div>
      </form>
    </ModalDemo>
  ),
};

export const ConfirmationModal: Story = {
  render: () => (
    <ModalDemo title="Submit Proposal">
      <div className="space-y-4">
        <p className="text-muted-foreground">
          You&apos;re about to submit your proposal for this project. The employer
          will be notified immediately.
        </p>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm font-medium">Proposed Rate: ₾2,000</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Go Back</Button>
          <Button>Confirm & Submit</Button>
        </div>
      </div>
    </ModalDemo>
  ),
};

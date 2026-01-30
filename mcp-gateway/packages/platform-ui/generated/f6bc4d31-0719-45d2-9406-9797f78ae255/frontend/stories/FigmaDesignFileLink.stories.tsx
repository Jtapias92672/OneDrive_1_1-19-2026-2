import type { Meta, StoryObj } from '@storybook/react';
import { FigmaDesignFileLink } from './FigmaDesignFileLink';

const meta: Meta<typeof FigmaDesignFileLink> = {
  title: 'Components/FigmaDesignFileLink',
  component: FigmaDesignFileLink,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FigmaDesignFileLink>;

export const Default: Story = {
  args: {},
};

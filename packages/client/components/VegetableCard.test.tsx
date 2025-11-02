

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VegetableCard from './VegetableCard';
import { Language, Vegetable } from '../../common/types';

const mockVegetable: Vegetable = {
  id: 1,
  name: {
    [Language.EN]: 'Tomato',
    [Language.HI]: 'टमाटर',
  },
  price: 40,
  marketPrice: 50,
  unit: {
    [Language.EN]: 'kg',
    [Language.HI]: 'किलो',
  },
  image: 'https://example.com/tomato.jpg',
  isAvailable: true,
  category: 'FRUIT',
};

describe('VegetableCard', () => {
  it('renders the vegetable name, price, and unit correctly', () => {
    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={() => {}}
        onQuickAdd={() => {}}
      />
    );

    expect(screen.getByText('Tomato')).toBeInTheDocument();
    // The price and unit are in separate elements now
    expect(screen.getByText('₹40')).toBeInTheDocument();
    expect(screen.getByText('/ kg')).toBeInTheDocument();
    expect(screen.getByText('₹50')).toBeInTheDocument(); // marketPrice
  });

  it('displays the quantity and selected checkmark when a quantity is provided', () => {
    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={() => {}}
        onQuickAdd={() => {}}
        quantity="500g"
      />
    );

    expect(screen.getByText('500g')).toBeInTheDocument();
    expect(screen.getByLabelText('Selected')).toBeInTheDocument();
    expect(screen.queryByLabelText('Quick Add')).not.toBeInTheDocument();
  });

  it('displays the Quick Add button when quantity is not provided', () => {
    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={() => {}}
        onQuickAdd={() => {}}
      />
    );

    expect(screen.queryByText('500g')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Quick Add')).toBeInTheDocument();
    expect(screen.queryByLabelText('Selected')).not.toBeInTheDocument();
  });

  it('calls the onClick handler when the card is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={handleClick}
        onQuickAdd={() => {}}
      />
    );

    // The card itself is a button
    await user.click(screen.getByRole('button', { name: /Tomato/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls the onQuickAdd handler when the quick add button is clicked', async () => {
    const user = userEvent.setup();
    const handleQuickAdd = vi.fn();

    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={() => {}}
        onQuickAdd={handleQuickAdd}
      />
    );

    const quickAddButton = screen.getByLabelText('Quick Add');
    await user.click(quickAddButton);
    expect(handleQuickAdd).toHaveBeenCalledTimes(1);
  });

  it('clicking quick add does not trigger the main card onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const handleQuickAdd = vi.fn();

    render(
      <VegetableCard
        vegetable={mockVegetable}
        language={Language.EN}
        onClick={handleClick}
        onQuickAdd={handleQuickAdd}
      />
    );

    const quickAddButton = screen.getByLabelText('Quick Add');
    await user.click(quickAddButton);
    
    expect(handleQuickAdd).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
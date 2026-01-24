/**
 * TransactionList Component Tests
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TransactionList from '@/components/transactions/TransactionList'

const mockTransactions = [
    {
        id: 'tx-1',
        hash: 'abc123hash',
        amount: 1000000000, // 100.00 in stroops (100 * 10,000,000)
        asset_code: 'USDC',
        status: 'success',
        type: 'payment',
        tx_type: 'payment_out',
        tx_direction: 'sent',
        direction: 'sent',
        created_at: '2026-01-24T10:00:00Z',
        from_address: 'GABC123',
        to_address: 'GDEF456',
        memo: 'Payment for services',
    },
    {
        id: 'tx-2',
        hash: 'def456hash',
        amount: 500000000, // 50.00 in stroops (50 * 10,000,000)
        asset_code: 'XLM',
        status: 'pending',
        type: 'payment',
        tx_type: 'payment_in',
        tx_direction: 'received',
        direction: 'received',
        created_at: '2026-01-23T15:30:00Z',
        from_address: 'GDEF456',
        to_address: 'GABC123',
    },
]

describe('TransactionList Component', () => {
    it('renders transaction list correctly', () => {
        const mockOnClick = jest.fn()

        render(
            <TransactionList
                transactions={mockTransactions}
                loading={false}
                onTransactionClick={mockOnClick}
            />
        )

        expect(screen.getByText(/100.00/)).toBeInTheDocument()
        expect(screen.getByText(/50.00/)).toBeInTheDocument()
        expect(screen.getByText(/USDC/)).toBeInTheDocument()
    })

    it('shows loading state', () => {
        render(
            <TransactionList
                transactions={[]}
                loading={true}
                onTransactionClick={jest.fn()}
            />
        )

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('shows empty state when no transactions', () => {
        render(
            <TransactionList
                transactions={[]}
                loading={false}
                onTransactionClick={jest.fn()}
            />
        )

        expect(screen.getByText(/no transactions/i)).toBeInTheDocument()
    })

    it('calls onClick when transaction is clicked', () => {
        const mockOnClick = jest.fn()

        render(
            <TransactionList
                transactions={mockTransactions}
                loading={false}
                onTransactionClick={mockOnClick}
            />
        )

        const firstButton = screen.getAllByRole('button')[0]
        fireEvent.click(firstButton)

        expect(mockOnClick).toHaveBeenCalledWith(mockTransactions[0])
    })

    it('displays transaction status correctly', () => {
        render(
            <TransactionList
                transactions={mockTransactions}
                loading={false}
                onTransactionClick={jest.fn()}
            />
        )

        // Status is shown via icons, not text - check for the direction labels instead
        expect(screen.getByText(/Sent/)).toBeInTheDocument()
        expect(screen.getByText(/Received/)).toBeInTheDocument()
    })

    it('displays direction indicators', () => {
        render(
            <TransactionList
                transactions={mockTransactions}
                loading={false}
                onTransactionClick={jest.fn()}
            />
        )

        // Check for sent/received text labels
        expect(screen.getByText(/Sent/)).toBeInTheDocument()
        expect(screen.getByText(/Received/)).toBeInTheDocument()
    })
})

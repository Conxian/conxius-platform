import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SovereignFinancialOffice from "../SovereignFinancialOffice";

describe("SovereignFinancialOffice Component", () => {
  it("renders correctly with initial title and subtitle", () => {
    render(<SovereignFinancialOffice />);

    // Check main headers
    expect(screen.getByText("Sovereign Financial Office")).toBeDefined();
    expect(screen.getByText("Asset Orchestration & Liquidity Management")).toBeDefined();
  });

  it("displays correct initial operational units", () => {
    render(<SovereignFinancialOffice />);

    const units = ["Core Protocol", "State Indexing", "Liquidity Desk", "Community Grants"];
    units.forEach((unit) => {
      expect(screen.getByRole("button", { name: unit })).toBeDefined();
    });
  });

  it("shows initial correct total liquidity", () => {
    render(<SovereignFinancialOffice />);

    // Initial total liquidity should be 460,950 sBTC (420000 + 27300 * 1.5)
    expect(screen.getByText("460,950 sBTC")).toBeDefined();
  });

  it("displays correct details for Selected Unit", () => {
    render(<SovereignFinancialOffice />);

    // Default Selected Unit is 'Core Protocol'
    expect(screen.getByText("Unit Intelligence: Core Protocol")).toBeDefined();
    expect(screen.getByText("420,000 STX")).toBeDefined();
    expect(screen.getByText("+27,300 STX")).toBeDefined();
    expect(screen.getByText("610 BPS")).toBeDefined();
  });

  it("updates Selected Unit when another operational unit button is clicked", () => {
    render(<SovereignFinancialOffice />);

    // Click on 'Liquidity Desk' unit
    const liquidityDeskBtn = screen.getByRole("button", { name: "Liquidity Desk" });
    fireEvent.click(liquidityDeskBtn);

    // Selected Unit display should change
    expect(screen.getByText("Unit Intelligence: Liquidity Desk")).toBeDefined();
  });

  it("triggers simulation and remains active when clicking Harvest Yield", () => {
    render(<SovereignFinancialOffice />);

    const harvestBtn = screen.getByRole("button", { name: "Harvest Yield" });
    fireEvent.click(harvestBtn);

    // Verify that status is still ACTIVE
    expect(screen.getByText("ACTIVE")).toBeDefined();
  });
});

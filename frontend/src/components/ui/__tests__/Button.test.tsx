import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("renderiza el texto pasado como children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("aplica la variante primary por defecto", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-eva-500");
  });

  it("aplica la variante secondary cuando se especifica", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-lavender-100");
  });

  it("aplica la variante ghost cuando se especifica", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-transparent");
  });

  it("permite clases adicionales via className", () => {
    render(<Button className="extra-class">Styled</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("extra-class");
  });

  it("llama al onClick cuando se hace clic", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clickable</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("no llama al onClick cuando está deshabilitado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Disabled</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renderiza correctamente con variant y className combinados", () => {
    render(<Button variant="secondary" className="w-full">Full width</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-lavender-100");
    expect(button).toHaveClass("w-full");
  });
});

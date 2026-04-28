{
  description = "Conxius Platform: Declarative Control Plane for Sovereign Computing";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    nix-bitcoin.url = "github:fort-nix/nix-bitcoin";
    sops-nix.url = "github:Mic92/sops-nix";
  };

  outputs = { self, nixpkgs, nix-bitcoin, sops-nix, ... }: {
    nixosConfigurations = {
      # Define your nodes here
      # example-node = nixpkgs.lib.nixosSystem {
      #   system = "x86_64-linux";
      #   modules = [
      #     ./nixos/common/default.nix
      #     nix-bitcoin.nixosModules.default
      #     sops-nix.nixosModules.sops
      #   ];
      # };
    };
  };
}

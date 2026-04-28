{ config, pkgs, ... }:

{
  # Common configuration for all Conxian nodes
  networking.networkmanager.enable = true;
  time.timeZone = "UTC";

  environment.systemPackages = with pkgs; [
    neovim
    git
    curl
    openssl
    sops
    age
  ];

  services.openssh.enable = true;

  # Conxian-specific common settings
  # To be expanded as Phase 6 matures
}

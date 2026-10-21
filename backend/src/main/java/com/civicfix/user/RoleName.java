package com.civicfix.user;

public enum RoleName {
    CITIZEN,
    OFFICER,
    WORKER,
    ADMIN;

    public String toSecurityRole() {
        return "ROLE_" + this.name();
    }
}

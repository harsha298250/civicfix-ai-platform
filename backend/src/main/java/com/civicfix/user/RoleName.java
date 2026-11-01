package com.civicfix.user;

public enum RoleName {
    CITIZEN,
    OFFICER,
    WORKER,
    SUPERVISOR,
    ADMIN;

    public String toSecurityRole() {
        return "ROLE_" + this.name();
    }
}

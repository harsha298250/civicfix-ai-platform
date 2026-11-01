package com.civicfix.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateStaffRequest {

    @NotBlank(message = "Full legal name is required.")
    @Size(min = 2, max = 150, message = "Name must be between 2 and 150 characters.")
    private String fullName;

    @NotBlank(message = "Municipal email address is required.")
    @Email(message = "Valid email address is required.")
    private String email;

    @Pattern(regexp = "^$|^(\\+91[\\-\\s]?)?[6-9]\\d{9}$", message = "Phone must be a valid 10-digit Indian mobile number.")
    private String phone;

    @NotBlank(message = "Temporary staff password is required.")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters.")
    private String password;

    @NotBlank(message = "Staff role assignment is required (OFFICER or WORKER).")
    private String role;

    private String department;
    private String ward;

    public CreateStaffRequest() {}

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }
}


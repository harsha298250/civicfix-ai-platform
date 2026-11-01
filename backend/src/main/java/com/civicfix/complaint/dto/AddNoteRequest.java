package com.civicfix.complaint.dto;

import jakarta.validation.constraints.NotBlank;

public class AddNoteRequest {

    @NotBlank(message = "Note content is required.")
    private String note;

    public AddNoteRequest() {}

    public AddNoteRequest(String note) {
        this.note = note;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}

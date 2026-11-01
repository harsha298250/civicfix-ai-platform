package com.civicfix.gis.dto;

public class ReverseGeocodeResponse {

    private boolean success;
    private String displayName;
    private String streetAddress;
    private String cityDistrict;
    private String city;
    private String state;
    private String postcode;
    private Double lat;
    private Double lng;
    private String error;

    public ReverseGeocodeResponse() {}

    public static ReverseGeocodeResponse fallback(Double lat, Double lng, String error) {
        ReverseGeocodeResponse resp = new ReverseGeocodeResponse();
        resp.setSuccess(false);
        resp.setLat(lat);
        resp.setLng(lng);
        resp.setDisplayName(String.format("%.5f° N, %.5f° E", lat, lng));
        resp.setStreetAddress(String.format("Coordinates: %.5f, %.5f", lat, lng));
        resp.setCityDistrict("Tamil Nadu");
        resp.setCity("Tamil Nadu");
        resp.setState("Tamil Nadu");
        resp.setPostcode("");
        resp.setError(error);
        return resp;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getStreetAddress() {
        return streetAddress;
    }

    public void setStreetAddress(String streetAddress) {
        this.streetAddress = streetAddress;
    }

    public String getCityDistrict() {
        return cityDistrict;
    }

    public void setCityDistrict(String cityDistrict) {
        this.cityDistrict = cityDistrict;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostcode() {
        return postcode;
    }

    public void setPostcode(String postcode) {
        this.postcode = postcode;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}

package v1

import "time"

type PhotoMetadata struct {
	CaptureTime time.Time `json:"capture_time"`
	Location    string    `json:"location"`
	Resolution  string    `json:"resolution"`
	Exposure    float64   `json:"exposure"`
	Size        int64     `json:"size"`
	Device      string    `json:"device"`
	FocalLength float64   `json:"focal_length"`
	Aperture    float64   `json:"aperture"`
	ISO         int       `json:"iso"`
	WhiteBalance string    `json:"white_balance"`
	Flash       bool      `json:"flash"`
}

type FileResponse struct {
	ID       int64          `json:"id"`
	Filename string       `json:"filename"`
	Path     string         `json:"path"`
	Size     int64          `json:"size"`
	Metadata *PhotoMetadata `json:"metadata,omitempty"`
}
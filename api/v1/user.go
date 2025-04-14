package v1

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email" example:"1234@gmail.com"`
	Password string `json:"password" binding:"required" example:"123456"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"1234@gmail.com"`
	Password string `json:"password" binding:"required" example:"123456"`
}
type LoginResponseData struct {
	AccessToken string `json:"accessToken"`
}
type LoginResponse struct {
	Response
	Data LoginResponseData
}

type UpdateProfileRequest struct {
	Nickname string `json:"nickname" example:"alan"`
	Email    string `json:"email" binding:"required,email" example:"1234@gmail.com"`
}
type GetProfileResponseData struct {
	UserName   string `json:"userName"`
	Nickname string `json:"nickname" example:"alan"`
	Email    string `json:"email"`	
	Gender    int   `json:"gender"`  
	Avatar    string `json:"avatar"`
	DefaultStorageId uint `json:"defaultStorageId"`
	DefaultStorage string `json:"defaultStorage"`
	Lang	string `json:"lang"`
	TimeZone string `json:"timeZone"`
}
type GetProfileResponse struct {
	Response
	Data GetProfileResponseData
}

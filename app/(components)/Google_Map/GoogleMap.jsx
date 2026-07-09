const GoogleMapEmbed = (props) => {
    const {URL} = props;
    return (
        <div style={{ width: "100%", height: "200px" }}>
            <iframe
                title="Google Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={URL}
            ></iframe>
        </div>
    );
};

export default GoogleMapEmbed;

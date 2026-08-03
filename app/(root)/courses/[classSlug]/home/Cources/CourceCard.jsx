import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

const CourseCard = ({image, subject, Class}) => {
  return (
    <Card sx={{ width:'100%', height: '100%', borderRadius: 3, boxShadow: 2 }}>
      <CardActionArea>
        <CardMedia
          component="img"
          height="140"
          image={image}
          alt="green iguana"
        />
        <CardContent>
          <Typography gutterBottom component="div" noWrap>
            {subject}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CourseCard

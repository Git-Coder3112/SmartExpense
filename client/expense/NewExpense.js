import React, {useState, useEffect} from 'react'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import Button from '@material-ui/core/Button'
import auth from '../auth/auth-helper'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Icon from '@material-ui/core/Icon'
import { makeStyles } from '@material-ui/core/styles'
import {create} from './api-expense.js'
import {Link, Redirect} from 'react-router-dom'
import DateFnsUtils from '@date-io/date-fns'
import { DateTimePicker, MuiPickersUtilsProvider} from "@material-ui/pickers"
import Chip from '@material-ui/core/Chip'
import Tooltip from '@material-ui/core/Tooltip'
import CircularProgress from '@material-ui/core/CircularProgress'

const useStyles = makeStyles(theme => ({
  card: {
    maxWidth: 600,
    margin: 'auto',
    textAlign: 'center',
    marginTop: theme.spacing(5),
    paddingBottom: theme.spacing(2)
  },
  error: {
    verticalAlign: 'middle'
  },
  title: {
    marginTop: theme.spacing(2),
    color: theme.palette.openTitle,
    fontSize: '1em'
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 300
  },
  submit: {
    margin: 'auto',
    marginBottom: theme.spacing(2)
  },
  input: {
    display: 'none'
  },
  filename:{
    marginLeft:'10px'
  }
}))

export default function NewExpense() {
  const classes = useStyles()
  
  const [values, setValues] = useState({
      title: '',
      category: '',
      amount: '',
      incurred_on: new Date(),
      notes: '',
      redirect: false,
      error: ''
  })
  const [aiSuggestions, setAiSuggestions] = useState({
    loading: false,
    suggestedCategory: null,
    confidence: 0
  })
  const jwt = auth.isAuthenticated()
  
  // Get AI category suggestion when title changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (values.title && values.title.length > 3 && !values.category) {
        getAiSuggestion(values.title, values.amount);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [values.title, values.amount]);

  // Get AI category suggestion
  const getAiSuggestion = async (title, amount) => {
    if (!title || title.length < 3) return;
    
    setAiSuggestions({...aiSuggestions, loading: true});
    
    try {
      const response = await fetch('/api/expenses/ai/categorize', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + auth.isAuthenticated().token
        },
        body: JSON.stringify({ title, amount })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.category) {
        setAiSuggestions({
          loading: false,
          suggestedCategory: data.category,
          confidence: data.confidence || 0
        });
        
        // Auto-apply if confidence is high
        if (data.confidence > 0.7) {
          setValues({...values, category: data.category});
        }
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      setAiSuggestions({
        ...aiSuggestions,
        loading: false,
        error: 'Could not get AI suggestion'
      });
    }
  };

  const handleChange = name => event => {
    const value = name === 'photo'
      ? event.target.files[0]
      : event.target.value
    setValues({...values, [name]: value })
  }
  
  const handleDateChange = (date) => {
    setValues({...values, incurred_on: date });
  }

  const clickSubmit = () => {
    const expense = {
        title: values.title || undefined,
        category: values.category || undefined,
        amount: values.amount || undefined,
        incurred_on: values.incurred_on || undefined,
        notes: values.notes || undefined 
    }
    create({
        t: jwt.token
    }, expense).then((data) => {
        if (data.error) {
          setValues({...values, error: data.error})
        } else {
          setValues({...values, error: '', redirect: true})
        }
    })
  }

    if (values.redirect) {
      return (<Redirect to={'/'}/>)
    }
    return (<div>
      <Card className={classes.card}>
        <CardContent>
          <Typography type="headline" component="h2" className={classes.title}>
            Expense Record
          </Typography>
          <br/>
          <TextField id="title" label="Title" className={classes.textField} value={values.title} onChange={handleChange('title')} margin="normal"/><br/>
          <TextField id="amount" label="Amount ($)" className={classes.textField} value={values.amount} onChange={handleChange('amount')} margin="normal" type="number"/><br/>
          
          <TextField 
            id="category" 
            type="category" 
            label="Category" 
            className={classes.textField} 
            value={values.category} 
            onChange={handleChange('category')} 
            margin="normal"
            helperText="Start typing the expense title to get AI suggestions"
          />
          
          {aiSuggestions.loading && (
            <div style={{margin: '10px 0'}}>
              <CircularProgress size={20} style={{marginRight: 10}} />
              <span>Analyzing expense...</span>
            </div>
          )}
          
          {!aiSuggestions.loading && aiSuggestions.suggestedCategory && (
            <div style={{margin: '10px 0'}}>
              <Typography variant="caption" color="textSecondary">
                AI Suggestion: 
                <Tooltip title={`Confidence: ${Math.round(aiSuggestions.confidence * 100)}%`}>
                  <Chip 
                    label={aiSuggestions.suggestedCategory}
                    onClick={() => setValues({...values, category: aiSuggestions.suggestedCategory})}
                    color={values.category === aiSuggestions.suggestedCategory ? 'primary' : 'default'}
                    variant={values.category === aiSuggestions.suggestedCategory ? 'default' : 'outlined'}
                    size="small"
                    style={{marginLeft: 8, cursor: 'pointer'}}
                  />
                </Tooltip>
                {aiSuggestions.confidence > 0.7 && (
                  <span style={{marginLeft: 8, color: '#4caf50'}}>
                    <Icon style={{fontSize: 16, verticalAlign: 'middle'}}>check_circle</Icon>
                    <span style={{verticalAlign: 'middle'}}>High confidence</span>
                  </span>
                )}
              </Typography>
            </div>
          )}
          <br/>
          <br/>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <DateTimePicker
                    label="Incurred on"
                    className={classes.textField}
                    views={["year", "month", "date"]}
                    value={values.incurred_on}
                    onChange={handleDateChange}
                    showTodayButton
                />
          </MuiPickersUtilsProvider>
          <br/>
          <br/>
          <TextField
            id="multiline-flexible"
            label="Notes"
            multiline
            rows="2"
            value={values.notes}
            onChange={handleChange('notes')}
            className={classes.textField}
            margin="normal"
          /><br/> <br/>
           {
            values.error && (<Typography component="p" color="error">
              <Icon color="error" className={classes.error}>error</Icon>
              {values.error}</Typography>)
          }
        </CardContent>
        <CardActions>
          <Button color="primary" variant="contained" onClick={clickSubmit} className={classes.submit}>Submit</Button>
          <Link to='/myauctions' className={classes.submit}><Button variant="contained">Cancel</Button></Link>
        </CardActions>
      </Card>
    </div>)
}
